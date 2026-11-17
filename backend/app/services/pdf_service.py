import os
import hashlib
import uuid
import logging
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional
import fitz  # PyMuPDF
from app.core.config import settings

logger = logging.getLogger(__name__)

# Check if OCR is available
OCR_AVAILABLE = False
try:
    import pytesseract
    from PIL import Image
    import io
    # Test if tesseract executable is callable
    pytesseract.get_tesseract_version()
    OCR_AVAILABLE = True
except Exception:
    OCR_AVAILABLE = False

class PDFProcessingResult:
    def __init__(
        self,
        success: bool,
        original_filename: str,
        stored_filename: str,
        file_path: str,
        file_size_bytes: int,
        file_hash: str,
        page_count: int = 0,
        is_scanned: bool = False,
        upload_status: str = "Completed",
        error_message: Optional[str] = None,
        extracted_pages: Optional[List[Dict[str, Any]]] = None,
        full_text: str = ""
    ):
        self.success = success
        self.original_filename = original_filename
        self.stored_filename = stored_filename
        self.file_path = file_path
        self.file_size_bytes = file_size_bytes
        self.file_hash = file_hash
        self.page_count = page_count
        self.is_scanned = is_scanned
        self.upload_status = upload_status
        self.error_message = error_message
        self.extracted_pages = extracted_pages or []
        self.full_text = full_text

def calculate_sha256(content: bytes) -> str:
    """Calculate SHA-256 hash of file content for duplicate detection."""
    sha = hashlib.sha256()
    sha.update(content)
    return sha.hexdigest()

def process_pdf_file(
    content: bytes,
    original_filename: str,
    upload_dir: Optional[Path] = None
) -> PDFProcessingResult:
    """
    Validates, stores, extracts text and detects scanned/encrypted/corrupted PDFs.
    Preserves page numbers for extracted text.
    """
    target_dir = upload_dir or settings.UPLOAD_DIR
    target_dir.mkdir(parents=True, exist_ok=True)
    
    file_size = len(content)
    file_hash = calculate_sha256(content)
    
    # 1. Validate file size
    if file_size > settings.MAX_UPLOAD_SIZE_BYTES:
        return PDFProcessingResult(
            success=False,
            original_filename=original_filename,
            stored_filename="",
            file_path="",
            file_size_bytes=file_size,
            file_hash=file_hash,
            upload_status="Failed",
            error_message=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB."
        )
    
    # 2. Validate empty file
    if file_size == 0:
        return PDFProcessingResult(
            success=False,
            original_filename=original_filename,
            stored_filename="",
            file_path="",
            file_size_bytes=0,
            file_hash=file_hash,
            upload_status="Failed",
            error_message="The uploaded PDF file is empty (0 bytes)."
        )
    
    # 3. Check PDF header magic bytes (%PDF-)
    if not content.startswith(b"%PDF-"):
        return PDFProcessingResult(
            success=False,
            original_filename=original_filename,
            stored_filename="",
            file_path="",
            file_size_bytes=file_size,
            file_hash=file_hash,
            upload_status="Failed",
            error_message="Invalid file format. File does not have a valid PDF header."
        )

    # 4. Generate safe internal stored filename
    safe_suffix = Path(original_filename).suffix.lower()
    if safe_suffix != ".pdf":
        safe_suffix = ".pdf"
    stored_filename = f"{uuid.uuid4()}{safe_suffix}"
    stored_path = target_dir / stored_filename

    # Save to disk
    with open(stored_path, "wb") as f:
        f.write(content)

    # 5. Open and extract with PyMuPDF
    extracted_pages = []
    total_text_length = 0
    is_scanned = False
    
    try:
        doc = fitz.open(stream=content, filetype="pdf")
    except Exception as e:
        logger.error(f"Failed to open PDF {original_filename}: {e}")
        return PDFProcessingResult(
            success=False,
            original_filename=original_filename,
            stored_filename=stored_filename,
            file_path=str(stored_path),
            file_size_bytes=file_size,
            file_hash=file_hash,
            upload_status="Failed",
            error_message=f"PDF is corrupted or unreadable: {str(e)}"
        )
    
    # Check encryption / password protection
    if doc.is_encrypted:
        doc.close()
        return PDFProcessingResult(
            success=False,
            original_filename=original_filename,
            stored_filename=stored_filename,
            file_path=str(stored_path),
            file_size_bytes=file_size,
            file_hash=file_hash,
            upload_status="Failed",
            error_message="Password-protected PDFs are not supported. Please remove encryption."
        )

    page_count = len(doc)
    if page_count == 0:
        doc.close()
        return PDFProcessingResult(
            success=False,
            original_filename=original_filename,
            stored_filename=stored_filename,
            file_path=str(stored_path),
            file_size_bytes=file_size,
            file_hash=file_hash,
            upload_status="Failed",
            error_message="The PDF contains no pages."
        )

    # Extract text page-by-page
    has_images = False
    for i in range(page_count):
        page = doc[i]
        page_num = i + 1
        page_text = page.get_text("text").strip()
        total_text_length += len(page_text)
        
        # Check if page has images
        images = page.get_images(full=True)
        if images:
            has_images = True
            
        extracted_pages.append({
            "page": page_num,
            "text": page_text
        })
    
    # Scanned PDF detection: very few characters per page but has images or multi-page with almost no text
    avg_chars_per_page = total_text_length / max(1, page_count)
    if avg_chars_per_page < 40 and (has_images or total_text_length < 30):
        is_scanned = True
        logger.info(f"Detected scanned PDF: {original_filename} (avg {avg_chars_per_page:.1f} chars/page)")
        
        # Attempt OCR if tesseract is available
        if OCR_AVAILABLE:
            try:
                ocr_pages = []
                for i in range(page_count):
                    page = doc[i]
                    page_num = i + 1
                    # Render page to pixmap
                    pix = page.get_pixmap(dpi=200)
                    img = Image.open(io.BytesIO(pix.tobytes("png")))
                    ocr_text = pytesseract.image_to_string(img).strip()
                    ocr_pages.append({"page": page_num, "text": ocr_text})
                extracted_pages = ocr_pages
                total_text_length = sum(len(p["text"]) for p in ocr_pages)
                logger.info(f"OCR successfully extracted {total_text_length} chars from {original_filename}")
            except Exception as ocr_err:
                logger.warning(f"OCR processing failed for {original_filename}: {ocr_err}")
        else:
            # Note OCR limitation
            logger.info("OCR is not available on this system. Scanned PDF marked.")

    doc.close()

    full_text = "\n\n--- Page Break ---\n\n".join(
        f"[Page {p['page']}]\n{p['text']}" for p in extracted_pages if p['text']
    )

    if total_text_length == 0:
        msg = "The PDF contains no readable text."
        if is_scanned and not OCR_AVAILABLE:
            msg = "Scanned / image-based PDF detected. No embedded text found, and OCR engine is not installed on this host."
        return PDFProcessingResult(
            success=False,
            original_filename=original_filename,
            stored_filename=stored_filename,
            file_path=str(stored_path),
            file_size_bytes=file_size,
            file_hash=file_hash,
            page_count=page_count,
            is_scanned=is_scanned,
            upload_status="Failed",
            error_message=msg,
            extracted_pages=extracted_pages,
            full_text=""
        )

    return PDFProcessingResult(
        success=True,
        original_filename=original_filename,
        stored_filename=stored_filename,
        file_path=str(stored_path),
        file_size_bytes=file_size,
        file_hash=file_hash,
        page_count=page_count,
        is_scanned=is_scanned,
        upload_status="Completed",
        error_message=None,
        extracted_pages=extracted_pages,
        full_text=full_text
    )
