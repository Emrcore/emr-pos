// src/components/Receipt.jsx
export default function Receipt({ cart, total, paymentType }) {
  const today = new Date().toLocaleString("tr-TR");

  return (
    <div className="p-4 text-xs font-mono w-[250px]">
      <h2 className="text-center font-bold text-base mb-2">EMR POS</h2>
      <div className="text-center mb-2">{today}</div>
      <hr />

      <div className="my-2">
        {cart.map((item, i) => (
          <div key={i} className="flex justify-between">
            <span>{item.product_name} x{item.quantity}</span>
            <span>{(item.quantity * item.price).toFixed(2)} ₺</span>
          </div>
        ))}
      </div>

      <hr />
      <div className="flex justify-between mt-2">
        <strong>Toplam:</strong>
        <strong>{total.toFixed(2)} ₺</strong>
      </div>
      <div className="flex justify-between">
        <span>Ödeme:</span>
        <span>{paymentType.toUpperCase()}</span>
      </div>

      <p className="text-center mt-4">Teşekkür ederiz</p>
    </div>
  );
}
