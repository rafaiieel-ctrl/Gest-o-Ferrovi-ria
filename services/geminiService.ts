

import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { OperationDetails, Tank, Vessel } from '../types';
import { numberToBr } from "../utils/helpers";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("API key for Gemini not found. AI features will be disabled.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

export async function analyzeOperationData(details: OperationDetails, tanks: Tank[], userPrompt: string, vessels: Vessel[]): Promise<string> {
    if (!API_KEY) {
        return "A chave da API do Gemini não foi configurada. A análise por IA está desativada.";
    }

    const vesselName = details.vesselId ? vessels.find(v => v.id === details.vesselId)?.name ?? 'N/A' : 'N/A';

    const dataContext = `
        **Análise de Operação de Biocombustíveis**

        **Detalhes da Operação:**
        - ID: ${details.id}
        - Tipo: ${details.type}
        - Modal: ${details.modal}
        - Embarcação: ${vesselName}
        - Responsável: ${details.responsavel}
        - Terminal: ${details.terminal}
        - Local: ${details.local}
        - Data/Hora: ${details.dateTime}

        **Dados dos Tanques:**
        ${tanks.map((tank, index) => `
        --- Tanque ${index + 1} ---
        - Identificação: ${tank.ident || 'N/A'}
        - Tanque/Compartimento: ${tank.tanque || 'N/A'}
        - Produto: ${tank.prod}
        - Cliente: ${tank.cliente || 'N/A'}
        - V. Ambiente (L): ${tank.vamb}
        - ρ Observada (kg/m³): ${tank.rho}
        - T Amostra (°C): ${tank.Ta}
        - T Tanque (°C): ${tank.Tt || 'N/A'}
        - Lacres: ${tank.lacres.join(', ') || 'Nenhum'}
        - **Resultados Calculados:**
            - ρ@20: ${numberToBr(tank.results.r20, 2)} kg/m³
            - FCV: ${numberToBr(tank.results.fcv, 4)}
            - INPM: ${numberToBr(tank.results.inpm, 2)}%
            - V@20 (L): ${numberToBr(tank.results.v20, 3)}
            - Status ANP: ${tank.results.status} (${tank.results.messages.join(', ') || 'OK'})
        `).join('\n')}
    `;

    const fullPrompt = `
        Com base nos seguintes dados de uma operação de biocombustíveis, responda à pergunta do usuário.
        Seja conciso e direto. Forneça insights úteis e aponte quaisquer anomalias ou pontos de atenção.

        ${dataContext}

        **Pergunta do Usuário:** "${userPrompt}"
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: fullPrompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new Error("Falha na comunicação com a API do Gemini.");
    }
}


export async function analyzeGaugingCertificate(images: {mimeType: string, data: string}[]): Promise<Partial<Vessel>> {
    if (!API_KEY) {
        throw new Error("A chave da API do Gemini não foi configurada. A análise por IA está desativada.");
    }
    
    const textPart = {
      text: `Você é um especialista em analisar Certificados de Arqueação de tanques de embarcações emitidos pelo INMETRO. Analise a(s) imagem(ns) ou o documento PDF fornecido(s) e extraia as informações em um formato JSON estrito. Se o certificado tiver várias páginas para a mesma tabela de tanque, consolide-as.
      
      O JSON deve ter a seguinte estrutura:
      
      {
        "name": "string",
        "certificateNumber": "string",
        "issueDate": "string (YYYY-MM-DD)",
        "expiryDate": "string (YYYY-MM-DD)",
        "executor": "string",
        "tanks": [
          {
            "tankName": "string",
            "maxCalibratedHeight": number,
            "maxVolume": number,
            "calibrationCurve": [
              { "height": number, "trim": number, "volume": number }
            ]
          }
        ]
      }
      
      Extraia os seguintes campos:
      - name: O nome da embarcação (campo EMBARCAÇÃO).
      - certificateNumber: O número do certificado (campo N°).
      - issueDate, expiryDate: As datas de emissão e validade. Converta para o formato YYYY-MM-DD.
      - executor: O nome da empresa executora (campo EXECUTOR).
      - tanks: Uma lista de tanques. Para cada tanque no documento:
        - tankName: O nome/número do tanque (ex: 'TANQUE 01 BB').
        - maxCalibratedHeight: A altura útil em cm (ALTURA ÚTIL).
        - maxVolume: O volume útil em litros (VOLUME(I)).
        - calibrationCurve: Esta é a parte mais importante. Você deve 'despivotar' a tabela de correção de trim. Para CADA célula de volume na tabela, crie um objeto. Por exemplo, para a linha onde 'ALTURA (cm)' é 10 e a coluna '50 (cm)' tem o volume '5.785', crie o objeto {"height": 10, "trim": 50, "volume": 5785}. Faça isso para todas as 5 colunas de trim (-50, -25, 0, 25, 50) e todas as linhas de altura. O resultado será uma longa lista de objetos. Importante: Os valores numéricos devem ser formatados corretamente para JSON: remova todos os separadores de milhar (ponto) e use ponto como separador decimal (substituindo a vírgula). Por exemplo: '5.785' se torna 5785; '146.360,80' se torna 146360.80.
        
      Responda APENAS com o objeto JSON. Não inclua texto explicativo, markdown, ou qualquer outra coisa fora do JSON.`
    };
    
    const imageParts = images.map(image => ({
        inlineData: {
            mimeType: image.mimeType,
            data: image.data
        }
    }));

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING },
            certificateNumber: { type: Type.STRING },
            issueDate: { type: Type.STRING },
            expiryDate: { type: Type.STRING },
            executor: { type: Type.STRING },
            tanks: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        tankName: { type: Type.STRING },
                        maxCalibratedHeight: { type: Type.NUMBER },
                        maxVolume: { type: Type.NUMBER },
                        calibrationCurve: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    height: { type: Type.NUMBER },
                                    trim: { type: Type.NUMBER },
                                    volume: { type: Type.NUMBER },
                                },
                                required: ['height', 'trim', 'volume'],
                            }
                        }
                    },
                    required: ['tankName', 'maxCalibratedHeight', 'maxVolume', 'calibrationCurve'],
                }
            }
        },
        required: ['name', 'certificateNumber', 'issueDate', 'expiryDate', 'executor', 'tanks'],
    };

    let response: GenerateContentResponse | undefined;
    try {
        response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [textPart, ...imageParts] },
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            }
        });

        const jsonString = response.text;
        
        if (!jsonString) {
            console.error("Error from Gemini API: Response text is empty or undefined.", { response });
            const finishReason = response.candidates?.[0]?.finishReason;
            const safetyRatings = response.candidates?.[0]?.safetyRatings;
            if (finishReason === 'SAFETY') {
                 throw new Error(`A resposta da IA foi bloqueada por motivos de segurança. Verifique o conteúdo do arquivo. Detalhes: ${JSON.stringify(safetyRatings)}`);
            }
            throw new Error(`A IA não retornou uma resposta válida (resposta vazia). Motivo: ${finishReason || 'Desconhecido'}`);
        }
        
        let cleanedJsonString = jsonString;
        
        const firstBrace = cleanedJsonString.indexOf('{');
        const lastBrace = cleanedJsonString.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace > firstBrace) {
            cleanedJsonString = cleanedJsonString.substring(firstBrace, lastBrace + 1);
        }
        
        cleanedJsonString = cleanedJsonString.replace(/}\s*{/g, '}, {');
        
        return JSON.parse(cleanedJsonString);

    } catch (error) {
        console.error("Error calling Gemini API for certificate analysis:", error);

        if (error instanceof SyntaxError && response) {
            console.error("Response text that failed to parse was:", response.text);
        }
        
        if (error instanceof Error) {
             throw new Error(`Falha ao analisar o certificado com a IA. Detalhes: ${error.message}`);
        }
        throw new Error(`Falha ao analisar o certificado com a IA. Verifique o console para mais detalhes.`);
    }
}