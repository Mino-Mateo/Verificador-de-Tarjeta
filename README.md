# Verificador de Tarjeta

Validación algorítmica de números de tarjeta de pago: dígito verificador (Luhn), marca por prefijo (IIN) y longitud permitida para esa marca. Todo se calcula localmente, sin consultar ninguna red de pago, banco ni base de datos.

Demo en vivo: https://mino-mateo.github.io/#tools

## Qué hace y qué no hace

Hace:

- Comprueba que el número cumple el algoritmo de Luhn y, si no, indica qué dígito verificador se esperaba.
- Identifica la marca por su prefijo: Visa, Mastercard, American Express, Discover, Diners Club, JCB, UnionPay y Maestro.
- Comprueba que la longitud es válida para esa marca.
- Devuelve el cálculo de Luhn paso a paso, para mostrarlo o auditarlo.

No hace:

- No confirma que la tarjeta exista, esté activa, tenga fondos o pertenezca a alguien.
- No consulta la fecha de vencimiento ni el CVV, y no los pide.
- No guarda ni envía nada: no hay red, almacenamiento ni analítica.

Un número "válido" aquí solo significa que es **estructuralmente consistente**. Es la misma comprobación que hace un formulario de pago antes de enviar los datos, útil para detectar errores de tipeo y para clasificar números en investigaciones.

## Uso responsable

Usa números de prueba públicos (tabla de abajo). No escribas tarjetas reales en herramientas que no controlas: aunque esta no envía nada, es un buen hábito. Validar el formato no da acceso a nada: sin emisor, vencimiento, CVV y autorización del banco, un número es solo una secuencia de dígitos.

## Cómo funciona

### 1. Limpieza

Se quitan espacios y guiones. Si queda algo que no sea un dígito, el número se rechaza. Una tarjeta tiene entre 12 y 19 dígitos (ISO/IEC 7812).

### 2. Algoritmo de Luhn (módulo 10)

Recorriendo el número de derecha a izquierda, sin contar el último dígito (el verificador), se duplica un dígito sí y otro no. Si el doble pasa de 9, se le resta 9. Luego se suman todos los valores, incluido el verificador. El número es válido si la suma es múltiplo de 10.

Ejemplo con `4242 4242 4242 4242`:

| Dígito | 4 | 2 | 4 | 2 | 4 | 2 | 4 | 2 | 4 | 2 | 4 | 2 | 4 | 2 | 4 | 2 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ¿Se duplica? | sí | no | sí | no | sí | no | sí | no | sí | no | sí | no | sí | no | sí | no |
| Valor | 8 | 2 | 8 | 2 | 8 | 2 | 8 | 2 | 8 | 2 | 8 | 2 | 8 | 2 | 8 | 2 |

Suma = 80, y 80 % 10 = 0: pasa Luhn.

El dígito verificador esperado para un cuerpo dado se obtiene agregando un 0 al final y calculando `(10 - suma % 10) % 10`. Luhn detecta cualquier error en un solo dígito y casi todas las transposiciones de dos dígitos adyacentes. Es el mismo principio que usa la cédula ecuatoriana (ver [Verificador de Cédula](https://github.com/Mino-Mateo/Verificador-de-C-dula)).

### 3. Marca por prefijo (IIN)

Los primeros dígitos identifican la red emisora. Cuando dos rangos se superponen, gana el prefijo más largo: por ejemplo, `622126` a `622925` es Discover (cobranding con UnionPay), mientras que el resto de `62` es UnionPay.

| Marca | Prefijos | Longitudes |
|---|---|---|
| Visa | 4 | 13, 16, 19 |
| Mastercard | 51-55, 2221-2720 | 16 |
| American Express | 34, 37 | 15 |
| Discover | 6011, 644-649, 65, 622126-622925 | 16-19 |
| Diners Club | 30, 36, 38, 39 | 14-19 |
| JCB | 3528-3589 | 16-19 |
| UnionPay | 62 | 16-19 |
| Maestro | 5018, 5020, 5038, 5893, 6304, 6759, 6761-6763 | 12-19 |

Fuente: [Payment card number, Wikipedia](https://en.wikipedia.org/wiki/Payment_card_number) (revisado el 2026-09-29). Los rangos cambian con el tiempo; la serie 2 de Mastercard, por ejemplo, está activa desde 2017.

### 4. Resultado

| Caso | Mensaje |
|---|---|
| Todo correcto | `Número válido: Visa` |
| Falla Luhn | `Dígito verificador incorrecto (esperado 2, recibido 1)` |
| Pasa Luhn sin marca conocida | `Pasa Luhn, pero el prefijo no corresponde a ninguna marca soportada` |
| Longitud distinta a la de la marca | `Longitud no válida para American Express: 16 dígitos (esperado 15)` |
| Caracteres no numéricos o fuera de 12-19 | `Formato inválido: ...` / `Longitud inválida: ...` |

## API

```ts
import { validarTarjeta, detectarMarca, pasosLuhn, digitoVerificador } from "./src/tarjeta.ts";

const r = validarTarjeta("4242 4242 4242 4242");
// r.valido   -> true
// r.mensaje  -> "Número válido: Visa"
// r.marca    -> { id: "visa", nombre: "Visa", prefijos: [...], longitudes: [13, 16, 19] }
// r.pasos    -> [{ digito: 4, duplicado: true, valor: 8 }, ...]
// r.suma     -> 80

digitoVerificador("424242424242424"); // -> 2
```

Sin dependencias en tiempo de ejecución. TypeScript solo para compilar.

## Números de prueba

Números públicos de la [documentación de pruebas de Stripe](https://docs.stripe.com/testing). No corresponden a tarjetas reales.

| Marca | Número |
|---|---|
| Visa | 4242 4242 4242 4242 |
| Mastercard | 5555 5555 5555 4444 |
| Mastercard (serie 2) | 2223 0031 2200 3222 |
| American Express | 3782 822463 10005 |
| Discover | 6011 1111 1111 1117 |
| Diners Club (14 dígitos) | 3622 720627 1667 |
| JCB | 3566 0020 2036 0505 |
| UnionPay (19 dígitos) | 6205 5000 0000 0000 004 |

## Cómo correrlo

Requiere Node.js 22.18 o superior (ejecuta TypeScript de forma nativa en los tests).

```bash
npm install
npm test          # 23 tests con node:test
npm run build     # compila src/ a dist/
npm run demo      # compila y sirve index.html en http://localhost:8000
```

## Estructura

```
src/tarjeta.ts          validador: Luhn, marcas, longitudes
test/tarjeta.test.ts    tests con números de prueba y casos límite
index.html              demo mínima que usa dist/tarjeta.js
```

## Autor

Mateo Miño, Investigador OSINT y Tech Lead en [eCondor Digital](https://econdordigital.org/). Portafolio: https://mino-mateo.github.io
