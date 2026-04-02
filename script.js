const pdfLib = window['pdfjs-dist/build/pdf'];
pdfLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

let masterData = {};

document.getElementById('universalUpload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    document.getElementById('loader').classList.remove('hidden');
    masterData = {};

    try {
        if (file.name.match(/\.(xlsx|xls|csv)$/)) {
            await processExcel(file);
        } else {
            await processPDF(file);
        }
        renderUI();
    } catch (err) {
        alert("فشل المعالج العالمي في التعرف على تنسيق هذا الملف.");
        console.error(err);
    } finally {
        document.getElementById('loader').classList.add('hidden');
    }
});

// معالج ملفات الإكسل (الأصيل، الأمين، إلخ)
async function processExcel(file) {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    rows.forEach(row => {
        // ذكاء اصطناعي بسيط للتعرف على العمود مهما كان اسمه
        let name = row['الاسم'] || row['اسم الحساب'] || row['البيان'] || row['Pharmacy'] || "عميل غير معرف";
        let id = row['الرقم'] || row['المعرف'] || row['رقم الحساب'] || row['ID'] || "000";
        let amount = parseFloat(row['المبلغ'] || row['الرصيد'] || row['مدين'] || row['Balance'] || 0);
        let date = row['التاريخ'] || row['Date'] || "---";

        if (amount !== 0) {
            if (!masterData[id]) masterData[id] = { id, name, bills: [], total: 0 };
            masterData[id].total += amount;
            masterData[id].bills.push({ n: "قائمة مستوردة", d: date, a: amount.toLocaleString() });
        }
    });
}

// معالج الـ PDF (الخوارزمية العالمية لاستخراج المبالغ)
async function processPDF(file) {
    const buffer = await file.arrayBuffer();
    const pdf = await pdfLib.getDocument({data: buffer}).promise;

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textObj = await page.getTextContent();
        const fullText = textObj.items.map(s => s.str).join(' ');

        // البحث عن الحسابات
        const accMatch = fullText.match(/(?:الاسم|اسم|الحساب)[:\-\s]*(.*?)(?=رقم|ID|تاريخ|موبايل)/);
        const idMatch = fullText.match(/(?:رقم|المعرف|ID)[:\-\s]*(\d+)/);

        if (idMatch) {
            const id = idMatch[1];
            const name = accMatch ? accMatch[1].trim() : "حساب: " + id;
            if (!masterData[id]) masterData[id] = { id, name, bills: [], total: 0 };

            // استخراج فواتير (نمط عالمي: تاريخ ثم مبلغ كبير)
            const billRegex = /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\s+([\d,]+\.\d{2}|[\d,]+)/g;
            let m;
            while ((m = billRegex.exec(fullText)) !== null) {
                masterData[id].bills.push({ n: "فاتورة نظام", d: m[1], a: m[2] });
                masterData[id].total += parseFloat(m[2].replace(/,/g, ''));
            }
        }
    }
}

function renderUI() {
    const grid = document.getElementById('mainGrid');
    const countLabel = document.getElementById('accCount');
    grid.innerHTML = "";
    
    const accounts = Object.values(masterData);
    countLabel.textContent = accounts.length;

    accounts.forEach(acc => {
        grid.innerHTML += `
        <div class="bg-white p-8 rounded-[2.5rem] shadow-sm border-2 border-transparent hover:border-indigo-500 hover:shadow-xl transition-all cursor-pointer group" onclick="openDetails('${acc.id}')">
            <div class="text-[10px] font-black text-indigo-500 mb-4 tracking-widest">ACCOUNT ID: ${acc.id}</div>
            <h3 class="text-2xl font-black text-slate-800 mb-8 leading-tight h-16 overflow-hidden">${acc.name}</h3>
            <div class="flex justify-between items-end border-t pt-6">
                <div>
                    <p class="text-slate-400 text-[10px] font-bold uppercase mb-1">Total Debt</p>
                    <p class="text-3xl font-black text-slate-900 tracking-tighter">${acc.total.toLocaleString()} <small class="text-sm font-bold text-slate-400 italic">IQD</small></p>
                </div>
                <div class="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
            </div>
        </div>`;
    });
}

function openDetails(id) {
    const acc = masterData[id];
    const modal = document.getElementById('modalOverlay');
    modal.classList.add('opacity-100', 'pointer-events-auto');
    
    document.getElementById('whatsappBtn').onclick = () => {
        const msg = `*بيور فارما برو*%0Aالعميل: ${acc.name}%0Aالمطالبة المالية: ${acc.total.toLocaleString()} د.ع`;
        window.open(`https://wa.me/?text=${msg}`, '_blank');
    };

    document.getElementById('modalBody').innerHTML = `
        <div class="mb-12 border-r-8 border-indigo-600 pr-8">
            <h2 class="text-5xl font-black text-slate-900 mb-2">${acc.name}</h2>
            <p class="text-slate-400 font-bold tracking-widest text-sm uppercase">Statement of Account for ID: ${acc.id}</p>
        </div>
        <table class="w-full text-right mb-12">
            <thead>
                <tr class="text-slate-400 text-xs font-black uppercase border-b-2">
                    <th class="py-4 px-2">رقم القائمة</th>
                    <th class="py-4 px-2 text-center">التاريخ</th>
                    <th class="py-4 px-2 text-left">المبلغ الصافي</th>
                </tr>
            </thead>
            <tbody class="divide-y">
                ${acc.bills.map(b => `
                    <tr class="hover:bg-slate-50 transition-colors">
                        <td class="py-6 font-bold text-slate-700">${b.n}</td>
                        <td class="py-6 text-center text-slate-400 font-mono text-sm">${b.d}</td>
                        <td class="py-6 text-left font-black text-indigo-900 text-xl">${b.a}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <div class="bg-slate-900 text-white p-12 rounded-[3rem] flex flex-col md:flex-row justify-between items-center shadow-2xl relative overflow-hidden">
            <div class="relative z-10 text-center md:text-right mb-6 md:mb-0">
                <p class="text-indigo-400 font-bold uppercase tracking-widest text-xs mb-2">Total Outstanding Balance</p>
                <p class="text-slate-400 text-sm italic">يرجى التسديد لتجنب إيقاف الحساب المالي</p>
            </div>
            <div class="relative z-10 text-5xl font-black tracking-tighter text-indigo-400">
                ${acc.total.toLocaleString()} <span class="text-xl text-white">IQD</span>
            </div>
        </div>
    `;
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('opacity-100', 'pointer-events-auto');
}
