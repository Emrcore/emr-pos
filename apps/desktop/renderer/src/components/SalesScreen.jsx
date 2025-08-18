import useBarcodeInput from "../hooks/useBarcodeInput";
import { buildReceipt } from "../utils/receiptBuilder";

export default function SalesScreen() {
  const cart = /* ...state... */;
  const settings = /* ...load from electronAPI.getSetting... */;

  async function handleBarcode(code) {
    const p = await window.electronAPI.findProductByBarcode(code);
    if (!p) return openQuickCreateModal(code);
    addCartLine(p);
  }

  useBarcodeInput(handleBarcode);

  async function completeSale(paymentType){
    const receipt = buildReceipt(cart, paymentType, settings);
    await window.electronAPI.printReceipt(receipt);
    // DB'ye satış kaydı, outbox’a push vs.
  }

  return (/* UI */);
}
