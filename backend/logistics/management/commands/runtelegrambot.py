import os
import secrets
import telebot
from telebot.types import ReplyKeyboardMarkup, KeyboardButton, WebAppInfo
from django.core.management.base import BaseCommand
from django.conf import settings
from logistics.models import ClientProfile, CompanySettings
from logistics.models import ProhibitedItem
from django.contrib.auth.models import User

# --- Initialize Bot ---
TOKEN = getattr(settings, 'TELEGRAM_BOT_TOKEN', 'YOUR_TOKEN_HERE')
bot = telebot.TeleBot(TOKEN)

# --- Texts & Languages ---
TEXTS = {
    'ru': {
        'welcome': "Добро пожаловать в Kayhon Cargo! У вас уже есть аккаунт?",
        'btn_yes': "✅ Да, у меня есть аккаунт",
        'btn_no': "🆕 Нет, хочу зарегистрироваться",
        'ask_contact': "Пожалуйста, нажмите кнопку ниже, чтобы отправить ваш номер телефона для регистрации.",
        'btn_send_contact': "📱 Отправить контакт",
        'ask_client_code': "Введите ваш ID код (client_code):",
        'ask_password': "Введите ваш пароль:",
        'success_reg': "Вы успешно зарегистрированы! Ваш ID: {code}\nОбязательно сохраните его.",
        'success_link': "Ваш аккаунт {code} успешно привязан!",
        'err_not_found': "Аккаунт не найден или неверный пароль. Попробуйте еще раз или напишите /start",
        'menu': "Главное меню:",
        'btn_track': "🔎 Отследить трек-код",
        'btn_cabinet': "👤 Личный кабинет",
        'btn_contacts': "📞 Контакты",
        'btn_rates': "📊 Тарифы",
        'btn_prohibited': "❌ Запрещённые грузы",
        'btn_address': "📍 Адрес склада",
        'btn_lang': "🌐 Сменить язык",
        'lang_changed': "Язык успешно изменен!",
        'webapp_url': "https://kayhon.vercel.app/telegram/{code}", # Замените на реальный URL
        'ask_track_code': "📦 Введите ваш трек-код для поиска:",
        'track_result_header': "🔍 *Результаты поиска:*\n",
        'track_result_item': "📦 *Трек:* `{track}`\n📝 Описание: {desc}\n⚖️ Вес: {weight} кг\n💰 К оплате: ${price}\n📍 Статус: _{status}_\n🗄 Полка: {shelf}\n",
        'track_not_found': "❌ Посылка с трек-кодом не найдена.",
    },
    'en': {
        'welcome': "Welcome to Kayhon Cargo! Do you already have an account?",
        'btn_yes': "✅ Yes, I have an account",
        'btn_no': "🆕 No, I want to register",
        'ask_contact': "Please click the button below to share your phone number for registration.",
        'btn_send_contact': "📱 Share Contact",
        'ask_client_code': "Enter your ID code (client_code):",
        'ask_password': "Enter your password:",
        'success_reg': "Successfully registered! Your ID: {code}\nPlease save it.",
        'success_link': "Account {code} successfully linked!",
        'err_not_found': "Account not found or invalid password. Please try again or type /start",
        'menu': "Main Menu:",
        'btn_track': "🔎 Track Package",
        'btn_cabinet': "👤 Personal Cabinet",
        'btn_contacts': "📞 Contacts",
        'btn_rates': "📊 Rates",
        'btn_prohibited': "❌ Prohibited Items",
        'btn_address': "📍 Warehouse Address",
        'btn_lang': "🌐 Change Language",
        'lang_changed': "Language successfully changed!",
        'webapp_url': "https://kayhon.vercel.app/telegram/{code}",
        'ask_track_code': "📦 Enter your track code:",
        'track_result_header': "🔍 *Search Results:*\n",
        'track_result_item': "📦 *Track:* `{track}`\n📝 Desc: {desc}\n⚖️ Weight: {weight} kg\n💰 Price: ${price}\n📍 Status: _{status}_\n🗄 Shelf: {shelf}\n",
        'track_not_found': "❌ Package with this track code not found.",
    },
    'tj': {
        'welcome': "Хуш омадед ба Kayhon Cargo! Шумо аллакай аккаунт доред?",
        'btn_yes': "✅ Бале, ман аккаунт дорам",
        'btn_no': "🆕 Не, мехоҳам регистратсия кунам",
        'ask_contact': "Лутфан тугмаи зерро пахш намуда, рақами телефони худро равон кунед.",
        'btn_send_contact': "📱 Равон кардани контакт",
        'ask_client_code': "ID коди худро ворид кунед (client_code):",
        'ask_password': "Пароли худро ворид кунед:",
        'success_reg': "Шумо бо муваффақият регистратсия шудед! ID-и шумо: {code}\nЛутфан онро нигоҳ доред.",
        'success_link': "Аккаунти {code} бо муваффақият пайваст карда шуд!",
        'err_not_found': "Аккаунт ёфт нашуд ё парол нодуруст аст. Дубора санҷед ё /start пахш кунед.",
        'menu': "Менюи асосӣ:",
        'btn_track': "🔎 Пайгирии бор",
        'btn_cabinet': "👤 Кабинети шахсӣ",
        'btn_contacts': "📞 Тамос",
        'btn_rates': "📊 Тарифҳо",
        'btn_prohibited': "❌ Борҳои манъшуда",
        'btn_address': "📍 Суроғаи анбор",
        'btn_lang': "🌐 Тағйири забон",
        'lang_changed': "Забон иваз карда шуд!",
        'webapp_url': "https://kayhon.vercel.app/telegram/{code}",
        'ask_track_code': "📦 Трек-коди худро ворид кунед:",
        'track_result_header': "🔍 *Натиҷаҳои ҷустуҷӯ:*\n",
        'track_result_item': "📦 *Трек:* `{track}`\n📝 Маълумот: {desc}\n⚖️ Вазн: {weight} кг\n💰 Нарх: ${price}\n📍 Ҳолат: _{status}_\n🗄 Раф: {shelf}\n",
        'track_not_found': "❌ Бор бо ин трек-код ёфт нашуд.",
    }
}

def get_text(lang, key, **kwargs):
    if lang not in TEXTS:
        lang = 'ru'
    text = TEXTS[lang].get(key, TEXTS['ru'].get(key, ""))
    return text.format(**kwargs)


# Simple memory state storage
user_states = {}

def set_state(user_id, state, data=None):
    user_states[user_id] = {'state': state, 'data': data or {}}

def get_state(user_id):
    return user_states.get(user_id, {}).get('state')

def get_state_data(user_id):
    return user_states.get(user_id, {}).get('data', {})


# --- Keyboards ---
def get_main_menu_keyboard(lang, client_code):
    markup = ReplyKeyboardMarkup(resize_keyboard=True, row_width=2)
    track_btn = KeyboardButton(get_text(lang, 'btn_track'))
    webapp_url = get_text(lang, 'webapp_url', code=client_code)
    cabinet_btn = KeyboardButton(get_text(lang, 'btn_cabinet'), web_app=WebAppInfo(url=webapp_url))
    contacts_btn = KeyboardButton(get_text(lang, 'btn_contacts'))
    rates_btn = KeyboardButton(get_text(lang, 'btn_rates'))
    prohibited_btn = KeyboardButton(get_text(lang, 'btn_prohibited'))
    address_btn = KeyboardButton(get_text(lang, 'btn_address'))
    lang_btn = KeyboardButton(get_text(lang, 'btn_lang'))

    markup.add(track_btn, cabinet_btn)
    markup.add(contacts_btn, rates_btn)
    markup.add(prohibited_btn, address_btn)
    markup.add(lang_btn)
    return markup


# --- Handlers ---
@bot.message_handler(commands=['start'])
def handle_start(message):
    telegram_id = str(message.from_user.id)
    try:
        profile = ClientProfile.objects.get(telegram_id=telegram_id)
        bot.send_message(
            message.chat.id, 
            get_text(profile.tg_language, 'menu'), 
            reply_markup=get_main_menu_keyboard(profile.tg_language, profile.client_code)
        )
    except ClientProfile.DoesNotExist:
        # User not registered or linked
        markup = ReplyKeyboardMarkup(resize_keyboard=True)
        markup.add(KeyboardButton(TEXTS['ru']['btn_yes']), KeyboardButton(TEXTS['ru']['btn_no']))
        bot.send_message(message.chat.id, TEXTS['ru']['welcome'], reply_markup=markup)
        set_state(message.from_user.id, 'WAITING_ACCOUNT_CHOICE')


@bot.message_handler(func=lambda m: get_state(m.from_user.id) == 'WAITING_ACCOUNT_CHOICE')
def handle_account_choice(message):
    if message.text in [TEXTS['ru']['btn_no'], TEXTS['en']['btn_no'], TEXTS['tj']['btn_no']]:
        markup = ReplyKeyboardMarkup(resize_keyboard=True)
        markup.add(KeyboardButton(TEXTS['ru']['btn_send_contact'], request_contact=True))
        bot.send_message(message.chat.id, TEXTS['ru']['ask_contact'], reply_markup=markup)
        set_state(message.from_user.id, 'WAITING_CONTACT')
    elif message.text in [TEXTS['ru']['btn_yes'], TEXTS['en']['btn_yes'], TEXTS['tj']['btn_yes']]:
        bot.send_message(message.chat.id, TEXTS['ru']['ask_client_code'], reply_markup=telebot.types.ReplyKeyboardRemove())
        set_state(message.from_user.id, 'WAITING_CLIENT_CODE')
    else:
        bot.send_message(message.chat.id, "Пожалуйста, используйте кнопки.")


@bot.message_handler(content_types=['contact'], func=lambda m: get_state(m.from_user.id) == 'WAITING_CONTACT')
def handle_contact(message):
    contact = message.contact
    telegram_id = str(message.from_user.id)
    phone = contact.phone_number
    # Normalize phone
    if not phone.startswith('+'):
        phone = '+' + phone

    first_name = message.from_user.first_name or "Client"
    
    # Check if a user with this phone exists via username
    user, created = User.objects.get_or_create(username=phone, defaults={'first_name': first_name})
    if created:
        # Генерируем уникальный пароль для каждого нового пользователя
        unique_password = secrets.token_urlsafe(10)  # Например: "xK3m9pQ7rZ"
        user.set_password(unique_password)
        user.save()
        
    profile, p_created = ClientProfile.objects.get_or_create(user=user, defaults={'phone_number': phone})
    profile.telegram_id = telegram_id
    profile.save()
    
    set_state(message.from_user.id, None)
    msg_text = get_text('ru', 'success_reg', code=profile.client_code)
    bot.send_message(message.chat.id, msg_text, reply_markup=get_main_menu_keyboard('ru', profile.client_code))


@bot.message_handler(func=lambda m: get_state(m.from_user.id) == 'WAITING_CLIENT_CODE')
def handle_client_code(message):
    client_code = message.text.strip()
    set_state(message.from_user.id, 'WAITING_PASSWORD', {'client_code': client_code})
    bot.send_message(message.chat.id, TEXTS['ru']['ask_password'])


@bot.message_handler(func=lambda m: get_state(m.from_user.id) == 'WAITING_PASSWORD')
def handle_password(message):
    password = message.text.strip()
    data = get_state_data(message.from_user.id)
    client_code = data.get('client_code')
    telegram_id = str(message.from_user.id)
    
    try:
        profile = ClientProfile.objects.get(client_code=client_code)
        if profile.user.check_password(password):
            profile.telegram_id = telegram_id
            profile.save()
            set_state(message.from_user.id, None)
            bot.send_message(
                message.chat.id, 
                get_text('ru', 'success_link', code=profile.client_code), 
                reply_markup=get_main_menu_keyboard('ru', profile.client_code)
            )
            # Delete password message for security if bot is admin
            try:
                bot.delete_message(message.chat.id, message.message_id)
            except Exception:
                pass
        else:
            bot.send_message(message.chat.id, TEXTS['ru']['err_not_found'])
            set_state(message.from_user.id, 'WAITING_CLIENT_CODE')
            bot.send_message(message.chat.id, TEXTS['ru']['ask_client_code'])
    except ClientProfile.DoesNotExist:
         bot.send_message(message.chat.id, TEXTS['ru']['err_not_found'])
         set_state(message.from_user.id, 'WAITING_CLIENT_CODE')
         bot.send_message(message.chat.id, TEXTS['ru']['ask_client_code'])


@bot.message_handler(func=lambda m: m.text in [TEXTS['ru']['btn_lang'], TEXTS['en']['btn_lang'], TEXTS['tj']['btn_lang']])
def change_language_handler(message):
    markup = ReplyKeyboardMarkup(resize_keyboard=True)
    markup.add(KeyboardButton('🇷🇺 RU'), KeyboardButton('🇬🇧 EN'), KeyboardButton('🇹🇯 TJ'))
    bot.send_message(message.chat.id, "Выберите язык / Select language / Забонро интихоб кунед:", reply_markup=markup)
    set_state(message.from_user.id, 'WAITING_LANGUAGE')

@bot.message_handler(func=lambda m: get_state(m.from_user.id) == 'WAITING_LANGUAGE')
def process_language(message):
    telegram_id = str(message.from_user.id)
    lang_map = {'🇷🇺 RU': 'ru', '🇬🇧 EN': 'en', '🇹🇯 TJ': 'tj'}
    selected_lang = lang_map.get(message.text, 'ru')
    
    try:
        profile = ClientProfile.objects.get(telegram_id=telegram_id)
        profile.tg_language = selected_lang
        profile.save()
        set_state(message.from_user.id, None)
        bot.send_message(
            message.chat.id, 
            get_text(selected_lang, 'lang_changed'), 
            reply_markup=get_main_menu_keyboard(selected_lang, profile.client_code)
        )
    except ClientProfile.DoesNotExist:
        set_state(message.from_user.id, None)
        bot.send_message(message.chat.id, get_text(selected_lang, 'lang_changed'))
        # Return to start since they are not linked
        handle_start(message)

from logistics.models import Package

@bot.message_handler(func=lambda m: get_state(m.from_user.id) == 'WAITING_TRACK_CODE')
def process_track_code(message):
    track_code = message.text.strip()
    telegram_id = str(message.from_user.id)
    lang = 'ru'
    profile = None
    
    try:
        profile = ClientProfile.objects.get(telegram_id=telegram_id)
        lang = profile.tg_language
    except ClientProfile.DoesNotExist:
        pass

    packages = Package.objects.filter(track_code__icontains=track_code)
    
    if packages.exists():
        msg = get_text(lang, 'track_result_header')
        for pkg in packages:
            status_display = dict(Package.STATUS_CHOICES).get(pkg.status, pkg.status) if hasattr(Package, 'STATUS_CHOICES') else pkg.status
            item = get_text(lang, 'track_result_item',
                            track=pkg.track_code,
                            desc=pkg.description or "---",
                            weight=pkg.weight or 0,
                            price=pkg.total_price or 0,
                            status=status_display,
                            shelf=pkg.shelf_location or "---")
            msg += item + "\n"
        bot.send_message(message.chat.id, msg, parse_mode='Markdown')
    else:
        bot.send_message(message.chat.id, get_text(lang, 'track_not_found'))
        
    set_state(message.from_user.id, None)
    
    if profile:
        bot.send_message(message.chat.id, get_text(lang, 'menu'), reply_markup=get_main_menu_keyboard(lang, profile.client_code))



@bot.message_handler(func=lambda m: True)
def default_handler(message):
    # Other menu buttons mock
    telegram_id = str(message.from_user.id)
    try:
        profile = ClientProfile.objects.get(telegram_id=telegram_id)
        lang = profile.tg_language
        text = message.text
        
        if text == get_text(lang, 'btn_track'):
            bot.send_message(message.chat.id, get_text(lang, 'ask_track_code'))
            set_state(message.from_user.id, 'WAITING_TRACK_CODE')

        elif text == get_text(lang, 'btn_contacts'):
            cfg = CompanySettings.get()
            phone = cfg.phone_bokhtar  # Основной номер Kayhon Cargo

            # Телефон в тексте — Telegram на мобильном делает его кликабельным автоматически
            caption = (
                "🏢 *Kayhon Cargo*\n"
                "━━━━━━━━━━━━━━━━━\n\n"
                "🕐 *Режим работы:* с 9:00 до 18:00\n"
                "☕ *Перерыв:* с 12:45 до 14:00\n\n"
                f"📞 *Телефон:* {phone}\n"
                "📸 *Instagram:* @kayhon\\_cargo\n\n"
                "_Нажмите на номер для звонка_ 👆"
            )

            # Только кнопка Instagram (tel: в кнопках Telegram не поддерживает)
            from telebot.types import InlineKeyboardMarkup, InlineKeyboardButton
            inline = InlineKeyboardMarkup()
            inline.add(
                InlineKeyboardButton("📸 Instagram", url="https://instagram.com/kayhon_cargo")
            )

            # Путь к фото через BASE_DIR Django (надёжно работает везде)
            from django.conf import settings as djsettings
            import os as _os
            photo_path = _os.path.join(
                djsettings.BASE_DIR,           # D:\KayhonCargo\backend
                '..', 'frontend', 'public', 'bot', 'contacts.jpg'
            )
            photo_path = _os.path.normpath(photo_path)

            try:
                with open(photo_path, 'rb') as photo_file:
                    bot.send_photo(
                        message.chat.id,
                        photo_file,
                        caption=caption,
                        parse_mode='Markdown',
                        reply_markup=inline
                    )
            except FileNotFoundError:
                # Если фото не найдено — отправим только текст
                bot.send_message(message.chat.id, caption, parse_mode='Markdown', reply_markup=inline)


        elif text == get_text(lang, 'btn_rates'):
            cfg = CompanySettings.get()
            tariff_field = {'ru': 'tariff_text_ru', 'en': 'tariff_text_en', 'tj': 'tariff_text_tj'}.get(lang, 'tariff_text_ru')
            tariff_text = getattr(cfg, tariff_field)

            from django.conf import settings as djsettings
            import os as _os
            photo_path = _os.path.normpath(_os.path.join(
                djsettings.BASE_DIR, '..', 'frontend', 'public', 'bot', 'price.jpg'
            ))

            try:
                with open(photo_path, 'rb') as photo_file:
                    bot.send_photo(
                        message.chat.id,
                        photo_file,
                        caption=tariff_text,
                        parse_mode='Markdown'
                    )
            except FileNotFoundError:
                bot.send_message(message.chat.id, tariff_text, parse_mode='Markdown')

        elif text == get_text(lang, 'btn_address'):
            cfg = CompanySettings.get()
            addr_msg = (
                f"🏢 *Адрес склада (Душанбе):*\n`{cfg.warehouse_address_ru}`\n\n"
                f"🇳🇨 *Адрес склада (Китай):*\n`{cfg.warehouse_address_china}`"
            )
            bot.send_message(message.chat.id, addr_msg, parse_mode='Markdown')

        elif text == get_text(lang, 'btn_prohibited'):
            items = list(ProhibitedItem.objects.values_list('keyword', flat=True).order_by('keyword'))

            # Назначаем иконки по ключевым словам в названии
            def pick_emoji(name: str) -> str:
                n = name.lower()
                if any(w in n for w in ['оружи', 'нож', 'шокер', 'дубин', 'пистол', 'ружь']): return '🔪'
                if any(w in n for w in ['наркот', 'наркоти',  'психотроп']): return '💊'
                if any(w in n for w in ['лекарств', 'таблет', 'порошок', 'препарат']): return '💊'
                if any(w in n for w in ['жидкост', 'парфюм', 'ароматизат', 'спирт']): return '🧴'
                if any(w in n for w in ['сигарет', 'кальян', 'табак', 'вейп', 'электрон']): return '🚬'
                if any(w in n for w in ['взрывч', 'бомб', 'граната', 'боеприпас']): return '💣'
                if any(w in n for w in ['животн', 'птиц', 'собак', 'кошк']): return '🐾'
                if any(w in n for w in ['деньг', 'валют', 'купюр']): return '💵'
                if any(w in n for w in ['алкогол', 'водк', 'пив', 'вино']): return '🍶'
                return '❌'

            if items:
                lines = [f"{pick_emoji(item)} {item}" for item in items]
                msg = (
                    "🚫 *Запрещённые к перевозке товары:*\n"
                    "━━━━━━━━━━━━━━━━━\n\n"
                    + "\n".join(lines) +
                    "\n\n━━━━━━━━━━━━━━━━━\n"
                    "⚠️ _Отправитель несёт полную ответственность "
                    "за содержимое посылки. При обнаружении запрещённых товаров "
                    "груз будет задержан и передан в соответствующие органы._"
                )
            else:
                msg = (
                    "🚫 *Запрещённые к перевозке товары:*\n"
                    "━━━━━━━━━━━━━━━━━\n\n"
                    "💊 Лекарства (порошок, таблетки, жидкие препараты)\n"
                    "🧴 Все виды жидкостей (парфюм, ароматизаторы и т.д.)\n"
                    "🔪 Холодное оружие (ножи, электрошокеры, дубинки)\n"
                    "🚬 Электронные сигареты, кальяны\n"
                    "💣 Взрывчатые вещества\n\n"
                    "━━━━━━━━━━━━━━━━━\n"
                    "⚠️ _За нарушение — полная ответственность отправителя._"
                )
            bot.send_message(message.chat.id, msg, parse_mode='Markdown')

        else:
            bot.send_message(message.chat.id, "Выберите действие из меню.", reply_markup=get_main_menu_keyboard(lang, profile.client_code))
    except ClientProfile.DoesNotExist:
        handle_start(message)


# --- Django Command ---
class Command(BaseCommand):
    help = 'Runs the Telegram Bot via long-polling'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("Kayhon Cargo Telegram Bot started successfully!"))
        bot.infinity_polling(timeout=10, long_polling_timeout=5)
