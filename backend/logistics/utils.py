# backend/logistics/utils.py
import pytesseract
from PIL import Image
import re
from .models import ClientProfile

# РАСКОММЕНТИРУЙ И УКАЖИ ПУТЬ К TESSERACT, ЕСЛИ ТЫ НА WINDOWS!
# pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def extract_client_from_photo(photo_file):
    """
    Принимает файл картинки, читает текст и пытается найти код клиента в БД.
    Возвращает объект ClientProfile или None.
    """
    try:
        # Открываем изображение
        image = Image.open(photo_file)
        
        # Распознаем текст (английский, так как ID у нас на латинице)
        text = pytesseract.image_to_string(image, lang='eng')
        
        # Ищем слова из латинских букв, цифр и знака '+' (от 3 до 15 символов)
        # Это вытащит: Saddam, Benyamin022493, ALi+ и т.д.
        potential_codes = re.findall(r'[A-Za-z0-9\+]{3,15}', text)
        
        if not potential_codes:
            return None
            
        # Ищем в БД, есть ли клиент с одним из найденных слов
        matched_client = ClientProfile.objects.filter(client_code__in=potential_codes).first()
        
        return matched_client
    except Exception as e:
        print(f"Ошибка OCR: {e}")
        return None