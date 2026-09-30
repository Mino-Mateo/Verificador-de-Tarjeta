// Validación algorítmica de números de tarjeta: Luhn + marca por prefijo (IIN) + longitud.
// No consulta ninguna red ni banco: solo dice si el número es estructuralmente consistente.
// Rangos: https://en.wikipedia.org/wiki/Payment_card_number (revisados 2026-09-29).

type Prefijo = string | [number, number];

export interface Marca {
  id: string;
  nombre: string;
  pais: string;
  entidad: string;
  prefijos: Prefijo[];
  longitudes: number[];
  // true: exige Luhn; false: no lo usa; null: sin documentación pública
  luhn: boolean | null;
  activa: boolean;
}

export interface PasoLuhn {
  digito: number;
  duplicado: boolean;
  valor: number;
}

export interface ResultadoTarjeta {
  valido: boolean;
  mensaje: string;
  marca: Marca | null;
  // Otras marcas cuyo prefijo también coincide (cobranding o rangos compartidos)
  otras: Marca[];
  pasos: PasoLuhn[];
  suma: number | null;
}

const rango = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const n = (...xs: number[]): Prefijo[] => xs.map(String);

// Ante un empate de largo gana la que aparece antes en la lista.
export const MARCAS: Marca[] = [
  // Redes internacionales
  { id: "visa", nombre: "Visa", pais: "Estados Unidos", entidad: "Visa Inc.", prefijos: ["4"], longitudes: [13, 16, 19], luhn: true, activa: true },
  { id: "mastercard", nombre: "Mastercard", pais: "Estados Unidos", entidad: "Mastercard Inc.", prefijos: [[51, 55], [2221, 2720]], longitudes: [16], luhn: true, activa: true },
  { id: "amex", nombre: "American Express", pais: "Estados Unidos", entidad: "American Express Company", prefijos: ["34", "37"], longitudes: [15], luhn: true, activa: true },
  { id: "discover", nombre: "Discover", pais: "Estados Unidos", entidad: "Discover Global Network", prefijos: ["6011", [644, 649], "65", [622126, 622925]], longitudes: rango(16, 19), luhn: true, activa: true },
  { id: "diners", nombre: "Diners Club", pais: "Estados Unidos", entidad: "Diners Club International", prefijos: ["30", "36", "38", "39"], longitudes: rango(14, 19), luhn: true, activa: true },
  { id: "jcb", nombre: "JCB", pais: "Japón", entidad: "JCB Co., Ltd.", prefijos: [[3528, 3589]], longitudes: rango(16, 19), luhn: true, activa: true },
  { id: "unionpay", nombre: "UnionPay", pais: "China", entidad: "China UnionPay", prefijos: ["62"], longitudes: rango(16, 19), luhn: true, activa: true },
  { id: "maestro", nombre: "Maestro", pais: "Internacional", entidad: "Mastercard Inc.", prefijos: ["5018", "5020", "5038", "5893", "6304", "6759", [6761, 6763]], longitudes: rango(12, 19), luhn: true, activa: true },
  { id: "maestro-uk", nombre: "Maestro UK", pais: "Reino Unido", entidad: "Mastercard Inc.", prefijos: ["676770", "676774"], longitudes: rango(12, 19), luhn: true, activa: true },
  { id: "uatp", nombre: "UATP", pais: "Internacional (aerolíneas)", entidad: "Universal Air Travel Plan", prefijos: ["1"], longitudes: [15], luhn: true, activa: true },

  // América Latina
  {
    id: "elo", nombre: "Elo", pais: "Brasil", entidad: "Elo Serviços S.A.",
    prefijos: [
      ...n(401178, 401179, 438935, 457631, 457632, 431274, 451416, 457393, 504175),
      [506699, 506778], [509000, 509999], ...n(627780, 636297, 636368),
      [650031, 650033], [650035, 650051], [650057, 650081], [650405, 650439], [650485, 650538],
      [650541, 650598], [650700, 650718], [650720, 650727], [650901, 650978], [651652, 651679],
      [651680, 651704], [655000, 655019], [655021, 655058],
    ],
    longitudes: [16], luhn: true, activa: true,
  },
  { id: "hipercard", nombre: "Hipercard", pais: "Brasil", entidad: "Itaú Unibanco", prefijos: ["606282"], longitudes: [16], luhn: true, activa: true },
  { id: "hiper", nombre: "Hiper", pais: "Brasil", entidad: "Itaú Unibanco", prefijos: n(637095, 63737423, 63743358, 637568, 637599, 637609, 637612), longitudes: [16], luhn: true, activa: true },
  { id: "naranja", nombre: "Naranja", pais: "Argentina", entidad: "Naranja X (Grupo Galicia)", prefijos: n(589562, 402918, 527572), longitudes: [16], luhn: true, activa: true },

  // Europa y Asia central
  { id: "mir", nombre: "Mir", pais: "Rusia", entidad: "NSPK (Sistema Nacional de Tarjetas de Pago)", prefijos: [[2200, 2204], "2205"], longitudes: rango(16, 19), luhn: true, activa: true },
  { id: "troy", nombre: "Troy", pais: "Turquía", entidad: "BKM (Bankalararası Kart Merkezi)", prefijos: ["65", "9792"], longitudes: [16], luhn: true, activa: true },
  { id: "dankort", nombre: "Dankort", pais: "Dinamarca", entidad: "Nets (Nexi)", prefijos: ["5019", "4571"], longitudes: [16], luhn: true, activa: true },
  { id: "ukrcart", nombre: "UkrCart", pais: "Ucrania", entidad: "UkrCart", prefijos: [[60400100, 60420099]], longitudes: rango(16, 19), luhn: true, activa: true },
  { id: "uzcard", nombre: "Uzcard", pais: "Uzbekistán", entidad: "Uzcard", prefijos: ["8600", "5614"], longitudes: [16], luhn: true, activa: true },
  { id: "humo", nombre: "HUMO", pais: "Uzbekistán", entidad: "HUMO (Banco Central de Uzbekistán)", prefijos: ["9860"], longitudes: [16], luhn: true, activa: true },

  // Asia y África
  { id: "rupay", nombre: "RuPay", pais: "India", entidad: "NPCI (National Payments Corporation of India)", prefijos: ["60", "65", "81", "82", "508", "353", "356"], longitudes: [16], luhn: true, activa: true },
  { id: "tunion", nombre: "China T-Union", pais: "China", entidad: "China T-Union (tarjetas de transporte)", prefijos: ["31"], longitudes: [19], luhn: true, activa: true },
  { id: "lankapay", nombre: "LankaPay", pais: "Sri Lanka", entidad: "LankaClear", prefijos: ["357111"], longitudes: [16], luhn: true, activa: true },
  { id: "gpn", nombre: "GPN", pais: "Indonesia", entidad: "Gerbang Pembayaran Nasional (Bank Indonesia)", prefijos: ["1946"], longitudes: [16, 18, 19], luhn: true, activa: true },
  { id: "napas", nombre: "Napas", pais: "Vietnam", entidad: "NAPAS", prefijos: ["9704"], longitudes: [16, 19], luhn: null, activa: true },
  { id: "verve", nombre: "Verve", pais: "Nigeria", entidad: "Interswitch", prefijos: [[506099, 506198], [650002, 650027], [507865, 507964]], longitudes: [16, 18, 19], luhn: true, activa: true },

  // Tarjetas de flota
  { id: "wex", nombre: "WEX", pais: "Estados Unidos", entidad: "WEX Inc. (tarjetas de flota)", prefijos: ["960046"], longitudes: [19], luhn: null, activa: true },

  // Redes retiradas: siguen apareciendo en registros antiguos y filtraciones
  { id: "bankcard", nombre: "Bankcard", pais: "Australia", entidad: "Bancos australianos (retirada en 2006)", prefijos: ["5610", [560221, 560225]], longitudes: [16], luhn: true, activa: false },
  { id: "solo", nombre: "Solo", pais: "Reino Unido", entidad: "Solo (retirada en 2011)", prefijos: ["6334", "6767"], longitudes: [16, 18, 19], luhn: true, activa: false },
];

// Largo del prefijo que coincide (0 si no coincide). Gana el más largo: 622126 es Discover, no UnionPay.
function coincidencia(numero: string, p: Prefijo): number {
  if (typeof p === "string") return numero.startsWith(p) ? p.length : 0;
  const largo = String(p[0]).length;
  const valor = Number(numero.slice(0, largo));
  return numero.length >= largo && valor >= p[0] && valor <= p[1] ? largo : 0;
}

// Todas las marcas que coinciden, de la más específica (prefijo más largo) a la menos.
export function marcasCoincidentes(numero: string): Marca[] {
  return MARCAS.map((marca, orden) => ({ marca, orden, largo: Math.max(0, ...marca.prefijos.map((p) => coincidencia(numero, p))) }))
    .filter((m) => m.largo > 0)
    .sort((a, b) => b.largo - a.largo || a.orden - b.orden)
    .map((m) => m.marca);
}

export function detectarMarca(numero: string): Marca | null {
  return marcasCoincidentes(numero)[0] ?? null;
}

// Desde la derecha, se duplica un dígito sí y otro no (sin contar el verificador); si pasa de 9, se resta 9.
export function pasosLuhn(numero: string): { pasos: PasoLuhn[]; suma: number } {
  const pasos = [...numero].map((c, i) => {
    const digito = Number(c);
    const duplicado = (numero.length - 1 - i) % 2 === 1;
    const doble = digito * 2;
    return { digito, duplicado, valor: duplicado ? (doble > 9 ? doble - 9 : doble) : digito };
  });
  return { pasos, suma: pasos.reduce((s, p) => s + p.valor, 0) };
}

export function digitoVerificador(cuerpo: string): number {
  return (10 - (pasosLuhn(cuerpo + "0").suma % 10)) % 10;
}

export function validarTarjeta(entrada: string): ResultadoTarjeta {
  const numero = entrada.replace(/[\s-]/g, "");
  const vacio = { marca: null, otras: [], pasos: [], suma: null };

  if (!/^\d+$/.test(numero)) {
    return { valido: false, mensaje: "Formato inválido: solo dígitos, espacios o guiones", ...vacio };
  }
  if (numero.length < 12 || numero.length > 19) {
    return { valido: false, mensaje: `Longitud inválida: ${numero.length} dígitos (una tarjeta tiene entre 12 y 19)`, ...vacio };
  }

  const [marca = null, ...otras] = marcasCoincidentes(numero);
  const { pasos, suma } = pasosLuhn(numero);
  const base = { marca, otras, pasos, suma };
  const pasaLuhn = suma % 10 === 0;

  // Solo se exige Luhn si la marca lo usa (o si no se reconoce la marca)
  if (!pasaLuhn && (!marca || marca.luhn === true)) {
    const esperado = digitoVerificador(numero.slice(0, -1));
    const recibido = numero.at(-1);
    return { valido: false, mensaje: `Dígito verificador incorrecto (esperado ${esperado}, recibido ${recibido})`, ...base };
  }
  if (!marca) {
    return { valido: false, mensaje: "Pasa Luhn, pero el prefijo no corresponde a ninguna marca soportada", ...base };
  }
  if (!marca.longitudes.includes(numero.length)) {
    return {
      valido: false,
      mensaje: `Longitud no válida para ${marca.nombre}: ${numero.length} dígitos (esperado ${marca.longitudes.join(", ")})`,
      ...base,
    };
  }

  const notas = [
    `${marca.pais}, ${marca.entidad}`,
    !marca.activa && "red retirada",
    marca.luhn === null && `Luhn no documentado para esta red (${pasaLuhn ? "pasa" : "no pasa"})`,
    otras.length > 0 && `el prefijo también coincide con ${otras.map((o) => o.nombre).join(", ")}`,
  ].filter(Boolean);
  return { valido: true, mensaje: `Número válido: ${marca.nombre} (${notas.join("; ")})`, ...base };
}
