import { test } from "node:test";
import assert from "node:assert/strict";
import { validarTarjeta, digitoVerificador, detectarMarca } from "../src/tarjeta.ts";

// Números de prueba públicos de Stripe: https://docs.stripe.com/testing
const VALIDAS: Array<[string, string]> = [
  ["4242424242424242", "visa"],
  ["4000056655665556", "visa"],
  ["5555555555554444", "mastercard"],
  ["2223003122003222", "mastercard"],
  ["5105105105105100", "mastercard"],
  ["378282246310005", "amex"],
  ["371449635398431", "amex"],
  ["6011111111111117", "discover"],
  ["6011000990139424", "discover"],
  ["3056930009020004", "diners"],
  ["36227206271667", "diners"],
  ["3566002020360505", "jcb"],
  ["6200000000000005", "unionpay"],
  ["6205500000000000004", "unionpay"],
];

for (const [numero, marca] of VALIDAS) {
  test(`válida: ${numero} es ${marca}`, () => {
    const r = validarTarjeta(numero);
    assert.equal(r.valido, true, r.mensaje);
    assert.equal(r.marca?.id, marca);
  });
}

test("acepta espacios y guiones", () => {
  assert.equal(validarTarjeta("4242 4242-4242 4242").valido, true);
});

test("rechaza letras", () => {
  const r = validarTarjeta("4242abcd42424242");
  assert.equal(r.valido, false);
  assert.match(r.mensaje, /Formato inválido/);
});

test("rechaza longitudes fuera de 12-19", () => {
  assert.match(validarTarjeta("42424242424").mensaje, /Longitud inválida: 11/);
  assert.match(validarTarjeta("42424242424242424242").mensaje, /Longitud inválida: 20/);
});

test("dígito verificador incorrecto informa el esperado", () => {
  const r = validarTarjeta("4242424242424241");
  assert.equal(r.valido, false);
  assert.equal(r.mensaje, "Dígito verificador incorrecto (esperado 2, recibido 1)");
  assert.equal(r.marca?.id, "visa");
});

test("pasa Luhn pero sin marca conocida", () => {
  const cuerpo = "999999999999999";
  const r = validarTarjeta(cuerpo + digitoVerificador(cuerpo));
  assert.equal(r.valido, false);
  assert.equal(r.marca, null);
  assert.match(r.mensaje, /ninguna marca/);
});

test("longitud incorrecta para la marca", () => {
  const cuerpo = "37828224631000"; // Amex exige 15; con verificador son 15, se agrega uno
  const n = cuerpo + "1";
  const largo = n + String(digitoVerificador(n));
  const r = validarTarjeta(largo);
  assert.equal(r.valido, false);
  assert.match(r.mensaje, /Longitud no válida para American Express: 16/);
});

test("prefijo más largo gana: 622126 es Discover, 6200 es UnionPay", () => {
  assert.equal(detectarMarca("6221260000000000")?.id, "discover");
  assert.equal(detectarMarca("6229250000000000")?.id, "discover");
  assert.equal(detectarMarca("6229260000000000")?.id, "unionpay");
});

test("bordes de rangos Mastercard 2-series y 51-55", () => {
  assert.equal(detectarMarca("2221000000000000")?.id, "mastercard");
  assert.equal(detectarMarca("2720990000000000")?.id, "mastercard");
  assert.equal(detectarMarca("2721000000000000"), null);
  assert.equal(detectarMarca("5000000000000000"), null);
  assert.equal(detectarMarca("5018000000000000")?.id, "maestro");
});

test("pasos de Luhn: duplica desde la derecha sin contar el verificador", () => {
  const r = validarTarjeta("4242424242424242");
  assert.deepEqual(r.pasos.slice(0, 2), [
    { digito: 4, duplicado: true, valor: 8 },
    { digito: 2, duplicado: false, valor: 2 },
  ]);
  assert.equal(r.suma, 80);
});

// ---- Redes regionales, cobranding y redes retiradas ----
import { MARCAS, marcasCoincidentes } from "../src/tarjeta.ts";

const conVerificador = (cuerpo: string) => cuerpo + digitoVerificador(cuerpo);
const relleno = (prefijo: string, largo: number) => conVerificador(prefijo.padEnd(largo - 1, "0"));

const REGIONALES: Array<[string, number, string]> = [
  ["606282", 16, "hipercard"],
  ["637095", 16, "hiper"],
  ["589562", 16, "naranja"],
  ["509000", 16, "elo"],
  ["2200", 16, "mir"],
  ["2205", 16, "mir"],
  ["9792", 16, "troy"],
  ["5019", 16, "dankort"],
  ["60400100", 16, "ukrcart"],
  ["8600", 16, "uzcard"],
  ["9860", 16, "humo"],
  ["81", 16, "rupay"],
  ["31", 19, "tunion"],
  ["357111", 16, "lankapay"],
  ["1946", 16, "gpn"],
  ["506099", 16, "verve"],
  ["676770", 16, "maestro-uk"],
  ["1", 15, "uatp"],
];

for (const [prefijo, largo, id] of REGIONALES) {
  test(`regional: ${prefijo}... (${largo}) es ${id}`, () => {
    const r = validarTarjeta(relleno(prefijo, largo));
    assert.equal(r.valido, true, r.mensaje);
    assert.equal(r.marca?.id, id);
    assert.ok(r.mensaje.includes(r.marca!.pais), r.mensaje);
  });
}

test("cobranding: Elo dentro del rango Visa lo informa", () => {
  const r = validarTarjeta(relleno("401178", 16));
  assert.equal(r.marca?.id, "elo");
  assert.deepEqual(r.otras.map((m) => m.id), ["visa"]);
  assert.match(r.mensaje, /también coincide con Visa/);
});

test("cobranding: Dankort 4571 con Visa, Naranja 527572 con Mastercard", () => {
  assert.deepEqual(marcasCoincidentes("4571000000000000").map((m) => m.id), ["dankort", "visa"]);
  assert.deepEqual(marcasCoincidentes("5275720000000000").map((m) => m.id), ["naranja", "mastercard"]);
});

test("empate de largo: 65 es Discover y menciona Troy y RuPay", () => {
  const r = validarTarjeta(relleno("65", 16));
  assert.equal(r.marca?.id, "discover");
  assert.deepEqual(r.otras.map((m) => m.id).sort(), ["rupay", "troy"]);
});

test("RuPay-JCB: 3530 es JCB con RuPay como cobranding", () => {
  assert.deepEqual(marcasCoincidentes("3530000000000000").map((m) => m.id), ["jcb", "rupay"]);
});

test("Luhn no documentado (Napas): no se exige, pero se informa", () => {
  const cuerpo = "970400000000000";
  const malo = cuerpo + ((digitoVerificador(cuerpo) + 1) % 10);
  const r = validarTarjeta(malo);
  assert.equal(r.valido, true, r.mensaje);
  assert.equal(r.marca?.id, "napas");
  assert.match(r.mensaje, /Luhn no documentado para esta red \(no pasa\)/);
});

test("red retirada: Solo se reconoce y se marca como retirada", () => {
  const r = validarTarjeta(relleno("6334", 16));
  assert.equal(r.valido, true);
  assert.equal(r.marca?.activa, false);
  assert.match(r.mensaje, /red retirada/);
});

test("catálogo: ids únicos, longitudes 12-19 y rangos bien formados", () => {
  const ids = MARCAS.map((m) => m.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const m of MARCAS) {
    for (const l of m.longitudes) assert.ok(l >= 12 && l <= 19, `${m.id}: longitud ${l}`);
    for (const p of m.prefijos) {
      if (typeof p === "string") assert.match(p, /^\d+$/, `${m.id}: prefijo ${p}`);
      else assert.ok(p[0] <= p[1] && String(p[0]).length === String(p[1]).length, `${m.id}: rango ${p}`);
    }
  }
});
