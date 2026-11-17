import io
import pytest
from app.services.pdf_service import (
    process_pdf_file, calculate_sha256, PDFProcessingResult
)
from app.utils.sample_generator import SAMPLE_DIR
import fitz

def test_pdf_hash_calculation():
    data1 = b"Sample resume data string"
    data2 = b"Sample resume data string"
    data3 = b"Different data"
    
    hash1 = calculate_sha256(data1)
    hash2 = calculate_sha256(data2)
    hash3 = calculate_sha256(data3)
    
    assert hash1 == hash2
    assert hash1 != hash3
    assert len(hash1) == 64

def test_extract_valid_pdf():
    # Pick one of our generated sample resumes
    sample_files = list(SAMPLE_DIR.glob("*.pdf"))
    assert len(sample_files) > 0, "Sample PDFs must exist"
    
    sample_path = sample_files[0]
    with open(sample_path, "rb") as f:
        content = f.read()
        
    result = process_pdf_file(content, sample_path.name)
    assert result.success is True
    assert result.page_count >= 1
    assert result.upload_status == "Completed"
    assert len(result.extracted_pages) >= 1
    assert "page" in result.extracted_pages[0]
    assert "text" in result.extracted_pages[0]
    assert len(result.full_text) > 100

def test_empty_pdf_detection():
    empty_content = b""
    result = process_pdf_file(empty_content, "empty.pdf")
    assert result.success is False
    assert result.upload_status == "Failed"
    assert "empty" in result.error_message.lower()

def test_corrupted_pdf_detection():
    corrupted_content = b"%PDF-1.4 Corrupted dummy data that is not a real PDF structure"
    result = process_pdf_file(corrupted_content, "corrupt.pdf")
    assert result.success is False
    assert result.upload_status == "Failed"
    assert "corrupted" in result.error_message.lower() or "unreadable" in result.error_message.lower()

def test_invalid_header_detection():
    non_pdf_content = b"This is a plain text file without PDF magic bytes."
    result = process_pdf_file(non_pdf_content, "fake.pdf")
    assert result.success is False
    assert result.upload_status == "Failed"
    assert "header" in result.error_message.lower()

def test_scanned_pdf_detection():
    # Create an in-memory PDF with an image or virtually no text
    doc = fitz.open()
    page = doc.new_page(width=300, height=300)
    # Don't add text, or just 1 character
    page.insert_text((50, 50), "X")
    pdf_bytes = doc.tobytes()
    doc.close()
    
    result = process_pdf_file(pdf_bytes, "scanned_test.pdf")
    assert result.is_scanned is True
