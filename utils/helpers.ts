
import { OperationDetails, Signatures, Tank, Vessel, VesselSchedule, VesselPerformanceStatus, UnitSettings } from "../types";

export const nowLocal = (): string => {
    try {
        const d = new Date();
        const z = d.getTimezoneOffset();
        return new Date(d.getTime() - z * 60000).toISOString().slice(0, 16);
    } catch (e) {
        return '';
    }
};

export const brToNumber = (value: string | number): number => {
    if (typeof value === 'number') return value;
    if (!value) return NaN;
    return parseFloat(String(value).replace(/\./g, '').replace(',', '.'));
};

export const numberToBr = (value: number, decimals: number = 2): string => {
    if (!isFinite(value)) return '—';
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value);
};

// --- Unit Conversion and Formatting Helpers ---

export const getUnitLabel = (type: 'volume' | 'mass', settings: UnitSettings): string => {
    if (type === 'volume') return settings.volume;
    return settings.mass;
};

export const formatQuantity = (value: number, baseUnit: 'L' | 'Kg', settings: UnitSettings, decimals?: number): string => {
    if (!isFinite(value)) return '—';

    if (baseUnit === 'L') {
        if (settings.volume === 'm³') {
            return `${numberToBr(value / 1000, decimals ?? 3)} m³`;
        }
        return `${numberToBr(value, decimals ?? 0)} L`;
    }

    if (baseUnit === 'Kg') {
        if (settings.mass === 't') {
            return `${numberToBr(value / 1000, decimals ?? 3)} t`;
        }
        return `${numberToBr(value, decimals ?? 0)} Kg`;
    }
    return numberToBr(value, decimals ?? 2); // fallback
};

export const parseQuantity = (value: string, baseUnit: 'L' | 'Kg', settings: UnitSettings): number => {
    const numValue = brToNumber(value);
    if (!isFinite(numValue)) return NaN;

    if (baseUnit === 'L' && settings.volume === 'm³') {
        return numValue * 1000;
    }
    if (baseUnit === 'Kg' && settings.mass === 't') {
        return numValue * 1000;
    }
    return numValue;
};

export const displayQuantity = (value: number, baseUnit: 'L' | 'Kg', settings: UnitSettings): string => {
    if (!isFinite(value)) return '';

    let displayValue: number;
    if (baseUnit === 'L' && settings.volume === 'm³') {
        displayValue = value / 1000;
    } else if (baseUnit === 'Kg' && settings.mass === 't') {
        displayValue = value / 1000;
    } else {
        displayValue = value;
    }
    
    // Format to string with up to 3 decimal places, replacing dot with comma
    return Number(displayValue.toFixed(3)).toLocaleString('pt-BR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 3,
    }).replace(/\./g, '');
};


// --- End Unit Helpers ---


export const exportReportToCsv = (headers: string[], data: Record<string, any>[], filename: string) => {
    const sep = ';';
    const headerRow = headers.join(sep);
    const rows = data.map(row => 
        headers.map(header => {
            // Simple sanitization to prevent breaking CSV format
            let value = String(row[header] || '');
            if (value.includes(sep) || value.includes('"') || value.includes('\n')) {
                value = `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        }).join(sep)
    );

    const csvContent = [headerRow, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};


export const exportToCsv = (details: OperationDetails, tanks: Tank[], signatures: Signatures, vessels: Vessel[]) => {
    const sep = ';';
    const headers = [
        'OP_ID', 'OP_Tipo', 'OP_Modal', 'OP_Embarcacao', 'OP_Responsavel', 'OP_Terminal', 'OP_Local', 'OP_DataHora', 'OP_Observacoes',
        'Tanque_ID', 'Tanque_Tipo', 'Tanque_Produto', 'Tanque_Ident', 'Tanque_Num', 'Tanque_Cliente',
        'Tanque_TDesc', 'Tanque_LDesc', 'Vamb_L', 'Rho_Obs', 'T_Amostra_C', 'T_Tanque_C',
        'Lacres', 'Res_Rho20', 'Res_FCV', 'Res_INPM', 'Res_V20_L', 'Res_Status', 'Res_Msgs',
        'Ass_Transportador', 'Ass_Certificadora', 'Ass_Representante'
    ];

    const vesselName = details.vesselId ? vessels.find(v => v.id === details.vesselId)?.name ?? '' : '';

    const sigTransportador = signatures.transportador ? 'Sim' : 'Não';
    const sigCertificadora = signatures.certificadora ? 'Sim' : 'Não';
    const sigRepresentante = signatures.representante ? 'Sim' : 'Não';

    const rows = tanks.map(tank => [
        details.id, details.type, details.modal, vesselName, details.responsavel, details.terminal, details.local, details.dateTime, details.observations || '',
        tank.id, tank.tipo, tank.prod, tank.ident, tank.tanque, tank.cliente,
        tank.tdesc, tank.ldesc, tank.vamb, tank.rho, tank.Ta, tank.Tt,
        tank.lacres.join('|'),
        numberToBr(tank.results.r20, 2),
        numberToBr(tank.results.fcv, 4),
        numberToBr(tank.results.inpm, 2),
        numberToBr(tank.results.v20, 3),
        tank.results.status,
        tank.results.messages.join('|'),
        sigTransportador,
        sigCertificadora,
        sigRepresentante,
    ].join(sep));

    const csvContent = '\uFEFF' + [headers.join(sep), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `${details.id || 'export'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const generateReportHtml = (details: OperationDetails, tanks: Tank[], signatures: Signatures, vessels: Vessel[]): string => {
    const totalV20 = tanks.reduce((sum, t) => sum + (isFinite(t.results.v20) ? t.results.v20 : 0), 0);
    const validInpmTanks = tanks.filter(t => isFinite(t.results.inpm));
    const avgInpm = validInpmTanks.length > 0 ? validInpmTanks.reduce((sum, t) => sum + t.results.inpm, 0) / validInpmTanks.length : NaN;
    const validR20Tanks = tanks.filter(t => isFinite(t.results.r20));
    const avgR20 = validR20Tanks.length > 0 ? validR20Tanks.reduce((sum, t) => sum + t.results.r20, 0) / validR20Tanks.length : NaN;

    const tanksHtml = tanks.map((tank, index) => `
        <tr class="${tank.prod === 'anidro' ? 'bg-blue-50' : 'bg-green-50'}">
            <td class="border p-2">${index + 1}</td>
            <td class="border p-2">${tank.ident}</td>
            <td class="border p-2">${tank.tanque}</td>
            <td class="border p-2">${tank.prod}</td>
            <td class="border p-2 text-right">${tank.vamb}</td>
            <td class="border p-2 text-right">${tank.rho}</td>
            <td class="border p-2 text-right">${tank.Ta}</td>
            <td class="border p-2 text-right">${numberToBr(tank.results.r20, 2)}</td>
            <td class="border p-2 text-right">${numberToBr(tank.results.fcv, 4)}</td>
            <td class="border p-2 text-right">${numberToBr(tank.results.inpm, 2)}%</td>
            <td class="border p-2 text-right font-bold">${numberToBr(tank.results.v20, 3)}</td>
            <td class="border p-2 ${tank.results.status === 'OK' ? 'text-green-600' : 'text-red-600'}">${tank.results.status}</td>
        </tr>
    `).join('');

    const sigBlock = (label: string, dataUrl: string | null) => `
        <div class="flex-1 min-w-[200px] border rounded-lg p-2 text-center">
            ${dataUrl ? `<img src="${dataUrl}" alt="Assinatura ${label}" class="mx-auto h-24 object-contain">` : '<div class="h-24 flex items-center justify-center text-gray-400">Sem assinatura</div>'}
            <p class="mt-2 border-t pt-2 font-semibold">${label}</p>
        </div>
    `;

    const vesselName = details.vesselId ? vessels.find(v => v.id === details.vesselId)?.name ?? 'N/A' : 'N/A';

    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <title>Relatório de Operação - ${details.id}</title>
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="p-4 font-sans">
        <div class="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-lg">
            <header class="text-center mb-6">
                <h1 class="text-3xl font-bold text-gray-800">Relatório de Operação de Biocombustíveis</h1>
                <p class="text-lg text-gray-600">${details.id}</p>
            </header>
            
            <section class="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><strong>Tipo:</strong> ${details.type}</div>
                <div><strong>Modal:</strong> ${details.modal}</div>
                <div><strong>Embarcação:</strong> ${vesselName}</div>
                <div><strong>Responsável:</strong> ${details.responsavel}</div>
                <div><strong>Terminal:</strong> ${details.terminal}</div>
                <div><strong>Local:</strong> ${details.local}</div>
                <div class="col-span-2"><strong>Data/Hora:</strong> ${new Date(details.dateTime).toLocaleString('pt-BR')}</div>
            </section>
            
            <section class="mb-6 bg-gray-50 p-4 rounded-lg grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div><p class="text-sm text-gray-500">V20 Total</p><p class="text-xl font-bold">${numberToBr(totalV20, 3)} L</p></div>
                <div><p class="text-sm text-gray-500">INPM Médio</p><p class="text-xl font-bold">${numberToBr(avgInpm, 2)} %</p></div>
                <div><p class="text-sm text-gray-500">ρ@20 Médio</p><p class="text-xl font-bold">${numberToBr(avgR20, 2)} kg/m³</p></div>
                 <div><p class="text-sm text-gray-500">Total de Tanques</p><p class="text-xl font-bold">${tanks.length}</p></div>
            </section>

            ${details.observations ? `
            <section class="mb-6">
                <h2 class="text-xl font-semibold mb-2 text-gray-700">Observações da Operação</h2>
                <div class="bg-gray-50 p-4 rounded-lg text-sm whitespace-pre-wrap">${details.observations}</div>
            </section>
            ` : ''}
            
            <section class="mb-6">
                <h2 class="text-xl font-semibold mb-2 text-gray-700">Detalhes dos Tanques</h2>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm text-left">
                        <thead class="bg-gray-100">
                            <tr>
                                ${['#', 'Ident.', 'Tanque', 'Prod.', 'V.Amb (L)', 'ρ Obs.', 'T Amostra (°C)', 'ρ@20', 'FCV', 'INPM', 'V@20 (L)', 'Status'].map(h => `<th class="border p-2">${h}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>${tanksHtml}</tbody>
                    </table>
                </div>
            </section>
            
             <section>
                <h2 class="text-xl font-semibold mb-2 text-gray-700">Assinaturas</h2>
                <div class="flex flex-wrap gap-4">
                    ${sigBlock('Transportador', signatures.transportador)}
                    ${sigBlock('Certificadora', signatures.certificadora)}
                    ${sigBlock('Representante', signatures.representante)}
                </div>
            </section>
        </div>
    </body>
    </html>`;
};

export const getCertificateStatus = (expiryDate: string): { text: 'N/A' | 'VENCIDO' | 'VENCE EM BREVE' | 'VÁLIDO'; color: string } => {
    if (!expiryDate) return { text: 'N/A', color: 'text-muted-foreground' };
    const now = new Date();
    const expiry = new Date(expiryDate);
    now.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);

    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: 'VENCIDO', color: 'text-red-500 font-bold' };
    if (diffDays <= 30) return { text: 'VENCE EM BREVE', color: 'text-yellow-500 font-bold' };
    return { text: 'VÁLIDO', color: 'text-green-500' };
};

export const getPerformanceStatus = (schedule: VesselSchedule): VesselPerformanceStatus | null => {
    const { etb, atb, etcStart, ats, etd, atd } = schedule;
    
    if (!atb) {
        return null;
    }

    const TOLERANCE_MS = 30 * 60 * 1000; // 30 minutes in milliseconds

    const getTime = (dateString?: string) => dateString ? new Date(dateString).getTime() : 0;
    
    const etbTime = getTime(etb);
    const atbTime = getTime(atb);
    const etcStartTime = getTime(etcStart);
    const atsTime = getTime(ats);
    const etdTime = getTime(etd);
    const atdTime = getTime(atd);

    const isLate = (atbTime > 0 && etbTime > 0 && atbTime > etbTime + TOLERANCE_MS) ||
                   (atsTime > 0 && etcStartTime > 0 && atsTime > etcStartTime + TOLERANCE_MS) ||
                   (atdTime > 0 && etdTime > 0 && atdTime > etdTime + TOLERANCE_MS);

    if (isLate) {
        return 'ATRASADO';
    }

    const isEarly = (atbTime > 0 && etbTime > 0 && atbTime < etbTime - TOLERANCE_MS) &&
                    (atdTime > 0 && etdTime > 0 && atdTime < etdTime - TOLERANCE_MS);

    if (isEarly) {
        return 'ADIANTADO';
    }

    return 'NO PRAZO';
};

export const generateMailtoLink = (to: string, subject: string, body: string) => {
    return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};

export const formatDateTime = (dateString?: string): string => {
    if (!dateString) return '—';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return 'Data Inválida';
        }
        return date.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return 'Data Inválida';
    }
};
