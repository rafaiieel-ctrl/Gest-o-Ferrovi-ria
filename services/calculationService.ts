import { ProductType, Tank } from '../types';
import { brToNumber } from '../utils/helpers';

export const ANP = {
    anidro: { rho20: { min: 789.0, max: 793.0 }, inpm: { min: 99.3, max: 100.0 } }, // Adjusted rho min based on common practice. Original html seems to have 0.
    hidratado: { rho20: { min: 805.2, max: 811.2 }, inpm: { min: 92.5, max: 94.6 } }
};

const COEF = {
    A: [913.76673, -221.75948, -59.61786, 146.82019, -566.5175, 621.18006, 3782.4439, -9745.3133, -9573.4653, 32677.808, 8763.7383, -39026.437],
    B: [-0.7943755, -0.0012168407, 3.5017833e-06, 1.770944e-07, -3.4138828e-09, -9.9880242e-11],
    C1: [-0.39158709, 1.1518337, -5.0416999, 13.381608, 4.5899913, -118.21, 190.5402, 339.81954, -900.32344, -349.32012, 1285.9318],
    C2: [-1.2083196e-4, -5.7466248e-3, 0.12030894, -0.23519694, -1.0362738, 2.1804505, 4.2763108, -6.8624848, -6.9384031, 7.4460428],
    C3: [-3.8683211e-05, -0.00020911429, 0.0026713888, 0.0041042045, -0.049364385, -0.017952946, 0.29012506, 0.023001712, -0.54150139],
    C4: [-5.6024906e-07, -1.2649169e-06, 3.486395e-06, -1.5168726e-06],
    C5: [-1.4441741e-08, 1.3470542e-08]
};

let RHO20_GRID: number[] = [], TEMP_GRID: number[] = [], FCV_FLAT_GRID: number[] = [], N_T = 0;

function rho_BS(T: number, GM: number): number {
    const dt = T - 20;
    const w = GM / 100;
    const y = w - 0.5;
    let rho = COEF.A[0];
    let yp = y;
    for (let i = 1; i < COEF.A.length; i++) {
        rho += COEF.A[i] * yp;
        yp *= y;
    }
    let dtp = dt;
    for (let k = 0; k < COEF.B.length; k++) {
        rho += COEF.B[k] * dtp;
        dtp *= dt;
    }
    const C = [null, COEF.C1, COEF.C2, COEF.C3, COEF.C4, COEF.C5];
    let dtpow = dt;
    for (let k = 1; k <= 5; k++) {
        const v = C[k];
        if (!v) break;
        let ypow = y;
        for (let i = 0; i < v.length; i++) {
            rho += v[i] * ypow * dtpow;
            ypow *= y;
        }
        dtpow *= dt;
    }
    return rho;
}

function gmFromRho(r: number, T: number): number {
    const f = (g: number) => rho_BS(T, g) - r;
    let lo = 0, hi = 100;
    let flo = f(0);
    for (let i = 0; i < 60; i++) {
        const m = (lo + hi) / 2;
        const fm = f(m);
        if (Math.abs(fm) < 1e-9) return m;
        if (flo * fm <= 0) {
            hi = m;
        } else {
            lo = m;
            flo = fm;
        }
    }
    return (lo + hi) / 2;
}

function buildGrid() {
    if (RHO20_GRID.length > 0) return;
    for (let x = 730; x <= 860; x += 0.5) RHO20_GRID.push(parseFloat(x.toFixed(1)));
    for (let t = 10; t <= 40; t += 0.5) TEMP_GRID.push(parseFloat(t.toFixed(1)));
    N_T = TEMP_GRID.length;

    for (let i = 0; i < RHO20_GRID.length; i++) {
        const r20 = RHO20_GRID[i];
        const GM = gmFromRho(r20, 20);
        for (let j = 0; j < N_T; j++) {
            const T = TEMP_GRID[j];
            const f = rho_BS(T, GM) / r20;
            FCV_FLAT_GRID.push(parseFloat(f.toFixed(4)));
        }
    }
     console.log('FCV grid built.');
}

function idxAxis(a: number[], x: number): [number, number, number] {
    if (!a.length || !isFinite(x)) return [0, 0, 0];
    if (x <= a[0]) return [0, 0, 0];
    if (x >= a[a.length - 1]) return [a.length - 1, a.length - 1, 0];
    for (let i = 0; i < a.length - 1; i++) {
        if (a[i] <= x && x <= a[i + 1]) {
            return [i, i + 1, (x - a[i]) / (a[i + 1] - a[i])];
        }
    }
    return [0, 0, 0];
}

function fcvTabela(r20: number, T: number): number {
    if (!RHO20_GRID.length) buildGrid();
    if (!isFinite(r20) || !isFinite(T)) return NaN;
    
    const ax = idxAxis(RHO20_GRID, r20);
    const ay = idxAxis(TEMP_GRID, T);
    const [i0, i1, fx] = ax;
    const [j0, j1, fy] = ay;
    
    const f00 = FCV_FLAT_GRID[i0 * N_T + j0];
    const f01 = FCV_FLAT_GRID[i0 * N_T + j1];
    const f10 = FCV_FLAT_GRID[i1 * N_T + j0];
    const f11 = FCV_FLAT_GRID[i1 * N_T + j1];

    const a = f00 + (f01 - f00) * fy;
    const b = f10 + (f11 - f10) * fy;
    return a + (b - a) * fx;
}

export function calculateTankMetrics(tank: Tank): Tank {
    if (tank.prod === 'granel') {
        const vambNum = brToNumber(tank.vamb);
        return {
            ...tank,
            results: {
                r20: 0,
                fcv: 1,
                inpm: 0,
                v20: isFinite(vambNum) ? vambNum : 0,
                status: 'OK',
                messages: ['Produto Granel - N/A para NBR 5992.']
            }
        };
    }

    const vamb = brToNumber(tank.vamb);

    if (tank.isEmpty || (isFinite(vamb) && vamb === 0)) {
        return {
            ...tank,
            vamb: '0',
            results: { r20: 0, fcv: 1, inpm: 0, v20: 0, status: 'OK', messages: [] }
        };
    }

    const rho = brToNumber(tank.rho);
    const Ta = brToNumber(tank.Ta);
    const Tt = brToNumber(tank.Tt);

    if (!isFinite(vamb) || !isFinite(rho) || !isFinite(Ta)) {
        return { ...tank, results: { r20: NaN, fcv: NaN, inpm: NaN, v20: NaN, status: 'PENDING', messages: [] } };
    }

    const GM = gmFromRho(rho, Ta);
    const r20 = rho_BS(20, GM);
    const tempForFcv = isFinite(Tt) ? Tt : Ta;
    const fcv = fcvTabela(r20, tempForFcv);
    const inpm = GM;
    const v20 = vamb * fcv;

    const spec = ANP[tank.prod as Exclude<ProductType, 'granel'>];
    const messages: string[] = [];
    if (isFinite(inpm) && (inpm < spec.inpm.min || inpm > spec.inpm.max)) {
        messages.push(`INPM ${inpm.toFixed(2)} fora do limite [${spec.inpm.min} - ${spec.inpm.max}]`);
    }
    if (isFinite(r20) && (r20 < spec.rho20.min || r20 > spec.rho20.max)) {
        messages.push(`ρ@20 ${r20.toFixed(2)} fora do limite [${spec.rho20.min} - ${spec.rho20.max}]`);
    }

    return {
        ...tank,
        results: {
            r20,
            fcv,
            inpm,
            v20,
            status: messages.length > 0 ? 'FORA' : 'OK',
            messages
        }
    };
}


export const interpolate = (targetHeight: number, points: { height: number, volume: number }[]): number => {
    if (!isFinite(targetHeight) || points.length < 2) return NaN;

    const sortedPoints = [...points].sort((a, b) => a.height - b.height);
    
    if (targetHeight < sortedPoints[0].height) return sortedPoints[0].volume;
    if (targetHeight > sortedPoints[sortedPoints.length - 1].height) return sortedPoints[sortedPoints.length - 1].volume;

    for (let i = 0; i < sortedPoints.length - 1; i++) {
        const p1 = sortedPoints[i];
        const p2 = sortedPoints[i+1];

        if (targetHeight === p1.height) return p1.volume;
        if (targetHeight === p2.height) return p2.volume;

        if (targetHeight > p1.height && targetHeight < p2.height) {
            const heightFraction = (targetHeight - p1.height) / (p2.height - p1.height);
            const volumeDiff = p2.volume - p1.volume;
            const interpolatedVolume = p1.volume + (volumeDiff * heightFraction);
            return interpolatedVolume;
        }
    }
    return NaN;
};


// Ensure grid is built on module load
buildGrid();