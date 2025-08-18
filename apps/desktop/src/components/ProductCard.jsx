export default function ProductCard({ product, onAdd }) {
  return (
    <div
      onClick={() => onAdd(product)}
      className="rounded-xl bg-white shadow hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer p-4 flex flex-col justify-between"
    >
      {/* Ürün görseli */}
      {product.image_url ? (
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full h-24 object-contain mb-2"
        />
      ) : (
        <div className="w-full h-24 bg-gray-100 flex items-center justify-center text-gray-400 mb-2 text-sm">
          Görsel Yok
        </div>
      )}

      {/* Ürün ismi */}
      <div className="text-base font-medium text-gray-800 truncate">{product.name}</div>

      {/* Kategori bilgisi */}
      {product.category && (
        <div className="text-xs text-gray-500 mt-1">{product.category}</div>
      )}

      {/* Fiyat */}
      <div className="text-right mt-2 text-lg font-bold text-green-600">
        {parseFloat(product.price).toFixed(2)} ₺
      </div>
    </div>
  );
}
