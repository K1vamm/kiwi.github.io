import webview
import sys

def main():
    try:
        # Создание безрамочного и изменяемого окна webview
        window = webview.create_window('My App', 'index.html', width=800, height=600, resizable=True, frameless=True)
        
        # Запуск приложения
        webview.start()
    except Exception as e:
        print(f"Произошла ошибка: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
