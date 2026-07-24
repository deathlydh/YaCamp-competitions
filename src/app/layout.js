import "./globals.css";

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata = {
  title: "Яндекс.Кемп 2026 · Финальная Робоэстафета",
  description: "Таблица результатов и панель мониторинга финального заезда роботов-скаутов Яндекс.Ровер и гусеничных манипуляторов GFS-X.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>
        {children}
      </body>
    </html>
  );
}
