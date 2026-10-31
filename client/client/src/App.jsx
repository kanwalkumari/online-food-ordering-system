import { useEffect, useMemo, useState } from "react";
import { ShoppingBag, Utensils, Search, Plus, Minus, ClipboardList } from "lucide-react";

const API = "http://localhost:5000/api";
const money = (value) => `Rs. ${Number(value).toLocaleString("en-PK")}`;

export default function App() {
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState({});
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState("menu");
  const [customer, setCustomer] = useState({ customerName: "", phone: "", address: "" });
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadMenu() {
    setLoading(true);
    try {
      const response = await fetch(`${API}/menu`);
      if (!response.ok) throw new Error("Menu request failed");
      setMenu(await response.json());
    } catch { setNotice("Cannot connect to the server. Start the backend first."); }
    finally { setLoading(false); }
  }
  async function loadOrders() {
    try {
      const response = await fetch(`${API}/orders`);
      if (response.ok) setOrders(await response.json());
    } catch { setNotice("Could not load order history."); }
  }
  useEffect(() => { loadMenu(); loadOrders(); }, []);

  const categories = useMemo(() => ["All", ...new Set(menu.map(item => item.category))], [menu]);
  const visible = menu.filter(item =>
    (category === "All" || item.category === category) &&
    `${item.name} ${item.description}`.toLowerCase().includes(search.toLowerCase())
  );
  const cartItems = Object.entries(cart).filter(([, quantity]) => quantity > 0);
  const total = cartItems.reduce((sum, [id, quantity]) => {
    const item = menu.find(entry => entry.id === Number(id));
    return sum + (item ? item.price * quantity : 0);
  }, 0);
  function changeQuantity(id, amount) {
    setCart(current => ({ ...current, [id]: Math.max(0, (current[id] || 0) + amount) }));
  }
  async function placeOrder(event) {
    event.preventDefault();
    if (!cartItems.length) return setNotice("Add at least one item to your cart.");
    try {
      const response = await fetch(`${API}/orders`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...customer,
          items: cartItems.map(([menuItemId, quantity]) => ({ menuItemId: Number(menuItemId), quantity }))
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Order could not be placed.");
      setNotice(`Order #${result.orderId} placed successfully. Total: ${money(result.total)}`);
      setCart({});
      setCustomer({ customerName: "", phone: "", address: "" });
      await loadOrders();
      setTab("orders");
    } catch (error) { setNotice(error.message); }
  }

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#"><span className="brand-icon"><Utensils size={20}/></span><span>byte<span className="brand-accent">bistro</span><small>GOOD FOOD, GOOD MOOD</small></span></a>
      <nav><button className={tab === "menu" ? "nav-active" : ""} onClick={() => setTab("menu")}>Explore Menu</button><button className={tab === "orders" ? "nav-active" : ""} onClick={() => { setTab("orders"); loadOrders(); }}>My Orders</button></nav>
      <button className="cart-pill" onClick={() => document.getElementById("cart")?.scrollIntoView({ behavior: "smooth" })}><ShoppingBag size={17}/> Cart <b>{cartItems.reduce((n, [, q]) => n + q, 0)}</b></button>
    </header>
    <main>
      <section className="hero"><div><span className="eyebrow">FRESHLY PREPARED · DELIVERED WITH CARE</span><h1>Good food.<br/><em>Great moments.</em></h1><p>Your favourites, made fresh and delivered to your door.</p><button className="primary-btn" onClick={() => { setTab("menu"); document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" }); }}>Explore dishes <span>↗</span></button></div><div className="hero-art"><div className="food-circle">🍔</div><span className="art-tag">MADE FRESH DAILY</span><span className="art-spark">✳</span></div></section>
      {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")}>×</button></div>}
      {tab === "menu" ? <div className="content-grid">
        <section id="menu" className="menu-section"><div className="section-heading"><div><span className="eyebrow">WHAT ARE YOU CRAVING?</span><h2>Explore our menu</h2></div><label className="search"><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search dishes..."/></label></div>
          <div className="categories">{categories.map(item => <button key={item} className={category === item ? "category-active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div>
          {loading ? <p>Loading menu...</p> : <div className="food-grid">{visible.map(item => <article className="food-card" key={item.id}><div className="food-image">{item.category === "Rice" ? "🍛" : item.category === "Sides" ? "🍟" : item.category === "Rolls" ? "🌯" : item.category === "Sandwiches" ? "🥪" : "🍔"}</div><div className="food-info"><span className="food-category">{item.category}</span><h3>{item.name}</h3><p>{item.description}</p><div className="food-bottom"><b>{money(item.price)}</b><button aria-label={`Add ${item.name}`} onClick={() => changeQuantity(item.id, 1)}><Plus size={17}/></button></div></div></article>)}</div>}
          {!loading && visible.length === 0 && <p>No dishes found. Try another search.</p>}
        </section>
        <aside id="cart" className="cart-panel"><div className="cart-title"><h2>Your order</h2><span>{cartItems.length} items</span></div>
          {cartItems.length === 0 ? <div className="empty-cart"><ShoppingBag size={28}/><p>Your cart is waiting.</p><small>Add something delicious from the menu.</small></div> : <div className="cart-lines">{cartItems.map(([id, quantity]) => { const item = menu.find(entry => entry.id === Number(id)); return item && <div className="cart-line" key={id}><div><b>{item.name}</b><small>{money(item.price)} each</small></div><div className="quantity"><button onClick={() => changeQuantity(id, -1)}><Minus size={13}/></button><span>{quantity}</span><button onClick={() => changeQuantity(id, 1)}><Plus size={13}/></button></div></div>; })}</div>}
          <div className="cart-total"><span>Subtotal</span><b>{money(total)}</b></div>
          <form className="checkout" onSubmit={placeOrder}><h3>Delivery details</h3><input required placeholder="Full name" value={customer.customerName} onChange={e => setCustomer({...customer, customerName:e.target.value})}/><input required placeholder="Phone number" value={customer.phone} onChange={e => setCustomer({...customer, phone:e.target.value})}/><textarea required placeholder="Delivery address" value={customer.address} onChange={e => setCustomer({...customer, address:e.target.value})}/><button className="primary-btn" type="submit" disabled={!cartItems.length}>Place order · {money(total)}</button></form>
        </aside>
      </div> : <section className="orders-section"><div className="section-heading"><div><span className="eyebrow">YOUR FOOD, YOUR HISTORY</span><h2>Recent orders</h2></div><ClipboardList size={28}/></div>{orders.length === 0 ? <p>No orders yet. Explore the menu to place your first order.</p> : orders.map(order => <article className="order-card" key={order.id}><div><b>Order #{order.id}</b><p>{order.items.map(item => `${item.item_name} × ${item.quantity}`).join(", ")}</p><small>{new Date(order.created_at + "Z").toLocaleString()}</small></div><div><span className="status">{order.status}</span><b>{money(order.total)}</b></div></article>)}</section>}
    </main>
    <footer>© {new Date().getFullYear()} Byte Bistro · A student project</footer>
  </div>;
}
