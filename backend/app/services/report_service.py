import csv
import io
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from app.models.models import ScreeningSession, Candidate
from app.core.config import settings

class ReportService:
    @staticmethod
    def generate_csv_ranking(session: ScreeningSession) -> str:
        """Generates CSV text for candidate ranking and scores."""
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Header info
        writer.writerow(["AI-Powered Resume Shortlisting Report"])
        writer.writerow(["Job Title", session.job_description.title if session.job_description else session.title])
        writer.writerow(["Department", session.department or "Not specified"])
        writer.writerow(["Screening Date", session.created_at.strftime("%Y-%m-%d %H:%M UTC")])
        writer.writerow([])
        
        # Table Header
        writer.writerow([
            "Rank",
            "Candidate Name",
            "Filename",
            "Overall Match Score (%)",
            "Interpretation Band",
            "Required Skills Coverage (%)",
            "Preferred Skills Coverage (%)",
            "Relevant Experience (Years)",
            "Total Experience (Years)",
            "Review Status",
            "Evidence Quality",
            "AI Generated",
            "Recruiter Notes"
        ])
        
        candidates = list(session.candidates)
        candidates.sort(key=lambda c: (c.analysis.overall_score if c.analysis else 0.0), reverse=True)
        
        for idx, c in enumerate(candidates):
            score = c.analysis.overall_score if c.analysis else 0.0
            band = c.analysis.interpretation_band if c.analysis else "Pending"
            req_cov = c.analysis.required_skills_coverage if c.analysis else 0.0
            pref_cov = c.analysis.preferred_skills_coverage if c.analysis else 0.0
            qual = c.analysis.evidence_quality if c.analysis else "N/A"
            is_ai = "Yes" if (c.analysis and c.analysis.is_ai_generated) else "Rule-based"
            filename = c.resume_file.original_filename if c.resume_file else ""
            
            writer.writerow([
                idx + 1,
                c.name,
                filename,
                f"{score:.1f}",
                band,
                f"{req_cov:.1f}",
                f"{pref_cov:.1f}",
                f"{c.relevant_experience_years:.1f}",
                f"{c.total_experience_years:.1f}",
                c.review_status,
                qual,
                is_ai,
                c.recruiter_notes or ""
            ])
            
        return output.getvalue()

    @staticmethod
    def generate_excel_report(session: ScreeningSession) -> bytes:
        """Generates a multi-sheet, beautifully formatted Excel workbook."""
        wb = Workbook()
        
        # Styling definitions
        navy_header = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
        indigo_header = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
        light_gray = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
        
        font_white_bold = Font(name="Arial", size=11, bold=True, color="FFFFFF")
        font_title = Font(name="Arial", size=15, bold=True, color="0F172A")
        font_sub = Font(name="Arial", size=10, italic=True, color="64748B")
        font_bold = Font(name="Arial", size=10, bold=True)
        font_regular = Font(name="Arial", size=10)
        
        thin_border = Border(
            left=Side(style='thin', color='CBD5E1'),
            right=Side(style='thin', color='CBD5E1'),
            top=Side(style='thin', color='CBD5E1'),
            bottom=Side(style='thin', color='CBD5E1')
        )
        
        # ----------------------------------------------------
        # Sheet 1: Executive Summary & Rankings
        # ----------------------------------------------------
        ws1 = wb.active
        ws1.title = "Candidate Rankings"
        ws1.views.sheetView[0].showGridLines = True
        
        job_title = session.job_description.title if session.job_description else session.title
        ws1["A1"] = "AI RESUME SCREENING REPORT"
        ws1["A1"].font = font_title
        ws1["A2"] = f"Job Title: {job_title} | Department: {session.department or 'N/A'} | Date: {session.created_at.strftime('%Y-%m-%d')}"
        ws1["A2"].font = font_sub
        
        headers_ws1 = [
            "Rank", "Candidate Name", "Match Score (%)", "Status Band", 
            "Required Skills %", "Preferred Skills %", "Relevant Exp (Yrs)", 
            "Review Status", "Evidence Quality", "Strengths Summary", "Key Missing Skills"
        ]
        
        for col_num, header in enumerate(headers_ws1, 1):
            cell = ws1.cell(row=4, column=col_num)
            cell.value = header
            cell.font = font_white_bold
            cell.fill = navy_header
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        
        candidates = list(session.candidates)
        candidates.sort(key=lambda c: (c.analysis.overall_score if c.analysis else 0.0), reverse=True)
        
        row_idx = 5
        for rank, c in enumerate(candidates, 1):
            analysis = c.analysis
            score = analysis.overall_score if analysis else 0.0
            band = analysis.interpretation_band if analysis else "Pending"
            req_cov = analysis.required_skills_coverage if analysis else 0.0
            pref_cov = analysis.preferred_skills_coverage if analysis else 0.0
            qual = analysis.evidence_quality if analysis else "N/A"
            strengths = ", ".join(analysis.strengths[:2]) if (analysis and analysis.strengths) else "N/A"
            missing = ", ".join(analysis.missing_qualifications[:2]) if (analysis and analysis.missing_qualifications) else "None noted"
            
            row_data = [
                rank, c.name, score, band, req_cov, pref_cov, 
                c.relevant_experience_years, c.review_status, qual, strengths, missing
            ]
            
            for col_idx, val in enumerate(row_data, 1):
                cell = ws1.cell(row=row_idx, column=col_idx)
                cell.value = val
                cell.font = font_regular
                cell.border = thin_border
                if col_idx in [1, 3, 5, 6, 7]:
                    cell.alignment = Alignment(horizontal="center")
                    if col_idx == 3:
                        cell.font = font_bold
                        # Highlight score
                        if score >= 85:
                            cell.fill = PatternFill(start_color="DCFCE7", end_color="DCFCE7", fill_type="solid") # green
                        elif score >= 70:
                            cell.fill = PatternFill(start_color="DBEAFE", end_color="DBEAFE", fill_type="solid") # blue
                        elif score >= 55:
                            cell.fill = PatternFill(start_color="FEF9C3", end_color="FEF9C3", fill_type="solid") # yellow
                        else:
                            cell.fill = PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid") # red
                elif col_idx in [4, 8, 9]:
                    cell.alignment = Alignment(horizontal="center")
            row_idx += 1
            
        for col in ws1.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = col[0].column_letter
            ws1.column_dimensions[col_letter].width = max(max_len + 3, 12)
            
        # ----------------------------------------------------
        # Sheet 2: Skills & Criteria Matrix
        # ----------------------------------------------------
        ws2 = wb.create_sheet(title="Skills Matrix")
        ws2.views.sheetView[0].showGridLines = True
        
        ws2["A1"] = f"Skills Matching Matrix - {job_title}"
        ws2["A1"].font = font_title
        
        mandatory = session.job_description.mandatory_skills if session.job_description else []
        headers_ws2 = ["Candidate", "Overall Score"] + [f"Req: {s}" for s in mandatory]
        
        for col_num, h in enumerate(headers_ws2, 1):
            cell = ws2.cell(row=3, column=col_num)
            cell.value = h
            cell.font = font_white_bold
            cell.fill = indigo_header
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            
        r_idx = 4
        for c in candidates:
            ws2.cell(row=r_idx, column=1, value=c.name).font = font_bold
            score_cell = ws2.cell(row=r_idx, column=2, value=c.analysis.overall_score if c.analysis else 0.0)
            score_cell.alignment = Alignment(horizontal="center")
            score_cell.font = font_bold
            
            # Matched skills mapping
            matched_dict = {}
            if c.analysis and c.analysis.skill_matches:
                for sm in c.analysis.skill_matches:
                    matched_dict[sm.skill_name.lower()] = sm.status
                    
            for idx, skill in enumerate(mandatory, 3):
                status = matched_dict.get(skill.lower(), "missing")
                cell = ws2.cell(row=r_idx, column=idx)
                if status == "matched":
                    cell.value = "✓ Matched"
                    cell.fill = PatternFill(start_color="DCFCE7", end_color="DCFCE7", fill_type="solid")
                elif status == "partial":
                    cell.value = "~ Partial"
                    cell.fill = PatternFill(start_color="FEF9C3", end_color="FEF9C3", fill_type="solid")
                else:
                    cell.value = "✗ Missing"
                    cell.fill = PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid")
                cell.alignment = Alignment(horizontal="center")
                cell.border = thin_border
            r_idx += 1
            
        for col in ws2.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = col[0].column_letter
            ws2.column_dimensions[col_letter].width = max(max_len + 2, 14)

        output = io.BytesIO()
        wb.save(output)
        return output.getvalue()

    @staticmethod
    def generate_pdf_report(session: ScreeningSession) -> bytes:
        """Generates a high-quality PDF executive screening report using ReportLab."""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )
        
        styles = getSampleStyleSheet()
        
        # Custom Typography Styles
        title_style = ParagraphStyle(
            'DocTitle',
            parent=styles['Heading1'],
            fontSize=22,
            leading=26,
            textColor=colors.HexColor("#0F172A"),
            fontName="Helvetica-Bold",
            spaceAfter=4
        )
        
        subtitle_style = ParagraphStyle(
            'DocSubTitle',
            parent=styles['Normal'],
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#64748B"),
            spaceAfter=14
        )
        
        h2_style = ParagraphStyle(
            'SectionHeader',
            parent=styles['Heading2'],
            fontSize=13,
            leading=16,
            textColor=colors.HexColor("#1E293B"),
            fontName="Helvetica-Bold",
            spaceBefore=12,
            spaceAfter=6
        )

        body_style = ParagraphStyle(
            'BodyTextCustom',
            parent=styles['Normal'],
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#334155")
        )
        
        table_text = ParagraphStyle(
            'TableText',
            parent=styles['Normal'],
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#1E293B")
        )

        table_header = ParagraphStyle(
            'TableHeader',
            parent=styles['Normal'],
            fontSize=8,
            leading=10,
            fontName="Helvetica-Bold",
            textColor=colors.white
        )

        elements = []
        
        # Header Section
        job_title = session.job_description.title if session.job_description else session.title
        elements.append(Paragraph("Candidate Screening & Shortlist Report", title_style))
        elements.append(Paragraph(
            f"<b>Position:</b> {job_title} | <b>Department:</b> {session.department or 'General'} | "
            f"<b>Date:</b> {session.created_at.strftime('%B %d, %Y')} | <b>Total Screened:</b> {len(session.candidates)}",
            subtitle_style
        ))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CBD5E1"), spaceAfter=12))

        # Executive Summary Table
        elements.append(Paragraph("Candidate Ranking Overview", h2_style))
        
        ranking_data = [[
            Paragraph("Rank", table_header),
            Paragraph("Candidate Name", table_header),
            Paragraph("Score", table_header),
            Paragraph("Match Band", table_header),
            Paragraph("Req Skills %", table_header),
            Paragraph("Rel Exp", table_header),
            Paragraph("Status", table_header)
        ]]
        
        candidates = list(session.candidates)
        candidates.sort(key=lambda c: (c.analysis.overall_score if c.analysis else 0.0), reverse=True)
        
        for idx, c in enumerate(candidates[:15], 1):
            score = c.analysis.overall_score if c.analysis else 0.0
            band = c.analysis.interpretation_band if c.analysis else "Pending"
            req_cov = c.analysis.required_skills_coverage if c.analysis else 0.0
            
            # Shorten band label for table
            short_band = "Strong" if score >= 85 else ("Good" if score >= 70 else ("Partial" if score >= 55 else "Lower"))
            
            ranking_data.append([
                Paragraph(str(idx), table_text),
                Paragraph(f"<b>{c.name}</b>", table_text),
                Paragraph(f"<b>{score:.1f}%</b>", table_text),
                Paragraph(short_band, table_text),
                Paragraph(f"{req_cov:.0f}%", table_text),
                Paragraph(f"{c.relevant_experience_years:.1f}y", table_text),
                Paragraph(c.review_status, table_text)
            ])
            
        rank_table = Table(ranking_data, colWidths=[35, 140, 50, 65, 65, 55, 120])
        rank_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#1E293B")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),
            ('ALIGN', (2, 0), (5, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ]))
        elements.append(rank_table)
        elements.append(Spacer(1, 14))

        # Top Candidates Detailed Breakdowns
        elements.append(Paragraph("Top Candidates Detailed Profiles", h2_style))
        
        for c in candidates[:5]:
            if not c.analysis:
                continue
            cand_box = []
            cand_box.append(Paragraph(
                f"<b>{c.name}</b> — Match Score: <b>{c.analysis.overall_score:.1f}%</b> ({c.analysis.interpretation_band})",
                ParagraphStyle('CandHeader', parent=styles['Normal'], fontSize=10, fontName="Helvetica-Bold", textColor=colors.HexColor("#1E293B"))
            ))
            cand_box.append(Paragraph(
                f"<b>Review Status:</b> {c.review_status} | <b>Relevant Exp:</b> {c.relevant_experience_years:.1f} yrs | "
                f"<b>Req Skills Coverage:</b> {c.analysis.required_skills_coverage:.1f}%",
                body_style
            ))
            
            if c.analysis.strengths:
                cand_box.append(Paragraph(f"<b>Key Strengths:</b> {'; '.join(c.analysis.strengths[:2])}", body_style))
            if c.analysis.missing_qualifications:
                cand_box.append(Paragraph(f"<b>Missing / Needs Verification:</b> {'; '.join(c.analysis.missing_qualifications[:2])}", body_style))
            if c.analysis.suggested_interview_questions:
                cand_box.append(Paragraph(f"<b>Suggested Question:</b> <i>\"{c.analysis.suggested_interview_questions[0]}\"</i>", body_style))
                
            cand_box.append(Spacer(1, 8))
            cand_box.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#E2E8F0"), spaceAfter=8))
            elements.append(KeepTogether(cand_box))

        # Build document
        doc.build(elements)
        return buffer.getvalue()
