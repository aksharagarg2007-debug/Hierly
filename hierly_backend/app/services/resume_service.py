import fitz  # PyMuPDF


def extract_text(pdf_bytes):
    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        text = "\n".join(page.get_text() for page in doc)
    except Exception:
        raise ValueError("This PDF could not be read.")
    if len(text.strip()) < 50:
        raise ValueError("No readable text found. Scanned/image PDFs are not supported.")
    return text
