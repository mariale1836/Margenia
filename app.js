
const $ = s => document.querySelector(s);
const money = n => new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(n||0);
const todayKey = () => new Date().toISOString().slice(0,10);
const storeKey='costos_app_v1';
let state = JSON.parse(localStorage.getItem(storeKey)||'{"movements":[]}');

function save(){localStorage.setItem(storeKey,JSON.stringify(state)); render();}
function todayMovs(){return state.movements.filter(m=>m.date===todayKey());}
function render(){
  const d=new Date();
  $('#todayLabel').textContent=d.toLocaleDateString('es-CL',{weekday:'long',day:'numeric',month:'long'});
  const ms=todayMovs();
  const sales=ms.filter(m=>m.type==='sale').reduce((a,m)=>a+m.amount,0);
  const costs=ms.filter(m=>m.type==='expense').reduce((a,m)=>a+m.amount,0);
  const profit=sales-costs;
  const margin=sales>0?profit/sales*100:0;
  $('#kpiSales').textContent=money(sales);
  $('#kpiCosts').textContent=money(costs);
  $('#kpiProfit').textContent=money(profit);
  $('#kpiMargin').textContent=margin.toFixed(1)+'%';
  $('#movements').innerHTML=ms.length?ms.slice().reverse().map(m=>`
    <div class="item">
      <div><strong>${escapeHtml(m.label)}</strong><small>${escapeHtml(m.detail||'')}</small></div>
      <div class="amount">${m.type==='expense'?'-':'+'}${money(m.amount)}</div>
    </div>`).join(''):'<p class="muted">Todavía no hay movimientos hoy.</p>';
}
function escapeHtml(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function addMovement(type,label,amount,detail=''){
  state.movements.push({id:Date.now()+Math.random(),date:todayKey(),type,label,amount:Number(amount)||0,detail});
  save();
}

$('#saleForm').addEventListener('submit',e=>{
  e.preventDefault();
  const p=$('#saleProduct').value.trim(), q=Number($('#saleQty').value), u=$('#saleUnit').value, price=Number($('#salePrice').value);
  addMovement('sale',p,q*price,`${q} ${u} × ${money(price)}`);
  e.target.reset(); $('#saleUnit').value='kg';
});
$('#expenseForm').addEventListener('submit',e=>{
  e.preventDefault();
  addMovement('expense',$('#expenseName').value.trim(),Number($('#expenseAmount').value),'Gasto / insumo');
  e.target.reset();
});
$('#clearToday').addEventListener('click',()=>{
  if(confirm('¿Borrar todos los movimientos de hoy?')){
    state.movements=state.movements.filter(m=>m.date!==todayKey()); save();
  }
});

function parseCLNumber(s){return Number(String(s).replace(/\./g,'').replace(',','.'))||0;}
function vegaParse(text){
  const t=text.toLowerCase().trim();
  let m;
  if((m=t.match(/(?:vend[ií]|vendimos|venta(?: de)?)\s+(\d+(?:[.,]\d+)?)\s*(kilos?|kg|unidades?|u)?\s*(?:de\s+)?(.+?)\s+(?:a|en)\s+\$?([\d.]+)/i))){
    const q=parseCLNumber(m[1]), unit=(m[2]||'u').startsWith('k')?'kg':'u', product=m[3].trim(), price=parseCLNumber(m[4]);
    addMovement('sale',product,q*price,`${q} ${unit} × ${money(price)}`);
    return `Registré la venta de ${q} ${unit} de ${product} a ${money(price)} cada ${unit}. Total: ${money(q*price)}.`;
  }
  if((m=t.match(/(?:gast[eé]|gasto|compr[eé]|compra)\s+(?:\$)?([\d.]+)\s+(?:en|de)\s+(.+)/i))){
    const amount=parseCLNumber(m[1]), name=m[2].trim();
    addMovement('expense',name,amount,'Registrado por Vega');
    return `Registré ${money(amount)} de gasto en ${name}.`;
  }
  if((m=t.match(/merma\s+(\d+(?:[.,]\d+)?)\s*(kilos?|kg|unidades?|u)?\s*(?:de\s+)?(.+)/i))){
    const q=parseCLNumber(m[1]), unit=(m[2]||'u').startsWith('k')?'kg':'u', product=m[3].trim();
    state.movements.push({id:Date.now(),date:todayKey(),type:'note',label:`Merma: ${product}`,amount:0,detail:`${q} ${unit}`}); save();
    return `Registré una merma de ${q} ${unit} de ${product}.`;
  }
  return 'Todavía no entendí esa frase. Prueba: “vendí 20 kilos de pan a 2000” o “gasté 14700 en harina”.';
}
$('#vegaForm').addEventListener('submit',e=>{
  e.preventDefault();
  const text=$('#vegaInput').value;
  $('#vegaReply').textContent=vegaParse(text);
  $('#vegaInput').value='';
});

function addIngredientRow(name='',cost=''){
  const row=document.createElement('div'); row.className='ingrow';
  row.innerHTML=`<input class="ingName" placeholder="Insumo" value="${escapeHtml(name)}"><input class="ingCost" type="number" min="0" step="1" placeholder="Costo" value="${cost}"><button type="button" aria-label="Eliminar">×</button>`;
  row.querySelector('button').addEventListener('click',()=>row.remove());
  $('#ingredientRows').appendChild(row);
}
$('#addIngredient').addEventListener('click',()=>addIngredientRow());
addIngredientRow('Harina','14700');
addIngredientRow('Manteca','5400');
addIngredientRow('Levadura','1200');
addIngredientRow('Sal','250');

$('#costForm').addEventListener('submit',e=>{
  e.preventDefault();
  const name=$('#calcName').value.trim()||'Producto';
  const y=Number($('#calcYield').value), price=Number($('#calcSalePrice').value);
  const costs=[...document.querySelectorAll('.ingCost')].map(i=>Number(i.value)||0);
  const total=costs.reduce((a,b)=>a+b,0);
  if(y<=0){$('#calcResult').textContent='El rendimiento debe ser mayor que 0.';return;}
  const cpu=total/y, profit=price-cpu, margin=price>0?profit/price*100:0;
  $('#calcResult').innerHTML=`<div class="box"><strong>${escapeHtml(name)}</strong><span>Costo total receta: ${money(total)}</span><span>Costo por kg/unidad: ${money(cpu)}</span><span>Venta por kg/unidad: ${money(price)}</span><span>Utilidad por kg/unidad: ${money(profit)}</span><span>Margen bruto: ${margin.toFixed(1)}%</span></div>`;
});

document.querySelectorAll('[data-scroll]').forEach(b=>b.addEventListener('click',()=>{
  const id=b.dataset.scroll;
  if(id==='top') window.scrollTo({top:0,behavior:'smooth'});
  else document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'center'});
}));

let deferredPrompt;
window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault(); deferredPrompt=e; $('#installBtn').classList.remove('hidden');
});
$('#installBtn').addEventListener('click',async()=>{
  if(!deferredPrompt)return;
  deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt=null; $('#installBtn').classList.add('hidden');
});
if('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js');
render();
// Margenia: recetas guardadas y precios para Vega
(() => {
  const key = 'margenia_recetas_v1';
  let recipes;
  try {
    recipes = JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    recipes = [];
  }
  if (!Array.isArray(recipes)) recipes = [];

  const normalize = s => String(s).normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  const panel = document.createElement('div');
  panel.className = 'stack';
  panel.innerHTML = `
    <label>Recetas guardadas en este teléfono</label>
    <select id="savedRecipe">
      <option value="">Elegir receta</option>
    </select>
    <label>Unidad de la receta</label>
    <select id="recipeUnit">
      <option value="kg">kg</option>
      <option value="u">unidades</option>
    </select>
    <p id="recipeStatus" class="muted" aria-live="polite"></p>
  `;
  $('#costForm').prepend(panel);

  function refresh() {
    const select = $('#savedRecipe');
    select.replaceChildren(new Option('Elegir receta', ''));
    recipes.forEach((r, i) => {
      select.add(new Option(r.name, String(i)));
    });
  }

  function load(r) {
    $('#calcName').value = r.name;
    $('#calcYield').value = r.yield;
    $('#calcSalePrice').value = r.price;
    $('#recipeUnit').value = r.unit;
    $('#ingredientRows').replaceChildren();
    r.ingredients.forEach(i => addIngredientRow(i.name, i.cost));
    $('#calcResult').textContent = '';
    $('#recipeStatus').textContent =
      'Receta cargada. Calcular guarda los cambios.';
  }

  $('#savedRecipe').addEventListener('change', e => {
    if (e.target.value !== '') {
      load(recipes[Number(e.target.value)]);
    }
  });

  $('#costForm').addEventListener('submit', () => {
    const name = $('#calcName').value.trim();
    const yieldValue = Number($('#calcYield').value);
    const price = Number($('#calcSalePrice').value);

    if (!name || !Number.isFinite(yieldValue) || yieldValue <= 0 ||
        !Number.isFinite(price) || price < 0) return;

    const ingredients = [...document.querySelectorAll('.ingrow')]
      .map(row => ({
        name: row.querySelector('.ingName').value.trim(),
        cost: Number(row.querySelector('.ingCost').value)
      }));

    if (ingredients.some(i =>
      !Number.isFinite(i.cost) || i.cost < 0)) return;

    const recipe = {
      name,
      yield: yieldValue,
      price,
      unit: $('#recipeUnit').value,
      ingredients
    };

    const index = recipes.findIndex(r =>
      normalize(r.name) === normalize(name));
    const next = recipes.slice();

    if (index < 0) next.push(recipe);
    else next[index] = recipe;

    try {
      localStorage.setItem(key, JSON.stringify(next));
      recipes = next;
      refresh();
      $('#savedRecipe').value =
        String(index < 0 ? recipes.length - 1 : index);
      $('#recipeStatus').textContent =
        'Receta y precio guardados en este teléfono.';
    } catch {
      $('#recipeStatus').textContent =
        'No se pudo guardar la receta. Revisa el espacio del teléfono.';
    }
  });

  const originalParse = vegaParse;
  let pending = null;

  function record(sale, price) {
    addMovement(
      'sale',
      sale.product,
      sale.qty * price,
      sale.qty + ' ' + sale.unit + ' × ' + money(price)
    );
    return 'Registré ' + sale.qty + ' ' + sale.unit +
      ' de ' + sale.product + ' a ' + money(price) +
      '. Total: ' + money(sale.qty * price) + '.';
  }

  vegaParse = function(text) {
    const t = text.trim();

    if (normalize(t) === 'cancelar') {
      pending = null;
      return 'Venta pendiente cancelada.';
    }

    if (pending) {
      const answer = t.match(/^(?:a\s+)?\$?([\d.]+)$/);
      if (answer && parseCLNumber(answer[1]) > 0) {
        const sale = pending;
        pending = null;
        return record(sale, parseCLNumber(answer[1]));
      }
      return 'Indica solo el precio por ' + pending.unit +
        ', por ejemplo 2000, o escribe cancelar.';
    }

    const m = t.match(
      /^(?:vend[ií]|vendimos|venta(?: de)?)\s+(\d+(?:[.,]\d+)?)\s*(kilos?|kg|unidades?|u)\s+(?:de\s+)?(.+?)\s*$/i
    );

    if (!m || /\s(?:a|en)\s+\$?[\d.,]+\s*$/i.test(t)) {
      return originalParse(text);
    }

    const sale = {
      qty: Number(m[1].replace(',', '.')),
      unit: /^k/i.test(m[2]) ? 'kg' : 'u',
      product: m[3].trim()
    };

    if (sale.qty <= 0) {
      return 'La cantidad debe ser mayor que cero.';
    }

    const product = normalize(sale.product);
    const matches = recipes.filter(r =>
      normalize(r.name) === product ||
      (product === 'pan' && normalize(r.name) === 'pan corriente')
    );

    if (matches.length === 1 &&
        matches[0].unit === sale.unit &&
        matches[0].price > 0) {
      sale.product = matches[0].name;
      return record(sale, matches[0].price);
    }

    pending = sale;
    return '¿A cuánto vendiste cada ' + sale.unit +
      ' de ' + sale.product +
      '? Escribe el precio, por ejemplo 2000. Aún no registré la venta.';
  };

  refresh();
  if (recipes.length) {
    load(recipes[0]);
    $('#savedRecipe').value = '0';
  }
})();
