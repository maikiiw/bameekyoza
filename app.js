// ====== ตั้งค่า ======
// ใส่ลิงก์ Google Sheet ที่ "เผยแพร่ไปยังเว็บ > CSV" ตรงนี้ (เว้นว่างไว้ = ใช้ไฟล์ data/products.csv สำรอง)
const SHEET_CSV_URL = "";
const LOCAL_CSV = "data/products.csv";
const SHOP = {
  name: "บะหมี่ซด ซด",
  address: "99/9 ถ.สุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110",
  phone: "081-234-5678",
};

// ====== อ่าน CSV (รองรับเครื่องหมายคำพูด) ======
function parseCSV(text) {
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((v) => v.trim() !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((v) => v.trim() !== "")) rows.push(row);
  const head = rows.shift().map((h) => h.trim());
  return rows.map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] || "").trim()])));
}

async function loadProducts() {
  let text;
  try {
    if (!SHEET_CSV_URL) throw new Error("no sheet url");
    const res = await fetch(SHEET_CSV_URL);
    if (!res.ok) throw new Error("sheet error");
    text = await res.text();
  } catch (e) {
    try {
      const res = await fetch(LOCAL_CSV);
      if (!res.ok) throw new Error("csv error");
      text = await res.text();
    } catch (e2) {
      // โหลดไม่ได้ทั้งสองทาง (เช่น เปิดไฟล์ตรง ๆ ในเครื่อง) -> ใช้ข้อมูลสำรองที่ฝังไว้
      return FALLBACK_PRODUCTS;
    }
  }
  const list = parseCSV(text).map((p) => ({ ...p, price: Number(p.price) || 0, stock: Number(p.stock) || 0 }));
  return list.length ? list : FALLBACK_PRODUCTS;
}

// ข้อมูลสำรอง (ตรงกับ data/products.csv)
const FALLBACK_PRODUCTS = [
  { sku: "BKM-001", name: "บะหมี่กึ่งสำเร็จรูป รสหมูแดง", desc: "เส้นเหนียวนุ่ม ซองน้ำมันกระเทียมเจียว หอมหมูแดง", price: 12, image: "images/bkm-001.svg", stock: 200 },
  { sku: "BKM-002", name: "บะหมี่กึ่งสำเร็จรูป รสต้มยำกุ้ง", desc: "เส้นเล็ก ซุปต้มยำเข้มข้น เผ็ดจัดจ้าน", price: 10, image: "images/bkm-002.svg", stock: 150 },
  { sku: "BKM-003", name: "บะหมี่กึ่งสำเร็จรูป รสเกี๊ยวกรอบ", desc: "เส้นไข่สูตรพิเศษ แถมเกี๊ยวกรอบ", price: 15, image: "images/bkm-003.svg", stock: 120 },
];

// ====== ออเดอร์ (เก็บใน localStorage ของเบราว์เซอร์) ======
const ORDER_KEY = "bakmi_orders_v1";
const getOrders = () => { try { return JSON.parse(localStorage.getItem(ORDER_KEY)) || []; } catch { return []; } };
const saveOrders = (o) => localStorage.setItem(ORDER_KEY, JSON.stringify(o));
const baht = (n) => n.toLocaleString("th-TH") + " บาท";
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
