const [form, setForm] = useState({ name:"", price:"", barcode:"", vat_rate:0.20 });

async function save(){
  await window.electronAPI.insertProduct(form);
  // toast + reset
}
