"""Genera los diagramas SVG del README y comprueba cada cálculo.

Uso: python3 docs/generar-diagramas.py  (desde la raíz del repo)
Los números son de prueba públicos (Stripe). El script recalcula Luhn y falla si no coincide.
"""
from html import escape

FONDO, PANEL, BORDE = "#0d0b14", "#17141f", "#2a2536"
TEXTO, TENUE = "#f4f1f8", "#a8a1b5"
COLORES = {
    "origen": "#fa93fa",
    "tipo": "#7dd3fc",
    "datos": "#f5b454",
    "secuencia": "#9ca3af",
    "verificador": "#4ade80",
}
LEYENDA = {
    "origen": "Emisor (IIN)",
    "tipo": "Industria (MII)",
    "datos": "Datos",
    "secuencia": "Cuenta",
    "verificador": "Se calcula",
}
FUENTE = "font-family='Segoe UI, Helvetica, Arial, sans-serif'"
MONO = "font-family='JetBrains Mono, Consolas, monospace'"


def t(x, y, s, size=14, color=TEXTO, anchor="start", mono=False, peso="400"):
    f = MONO if mono else FUENTE
    return f"<text x='{x}' y='{y}' {f} font-size='{size}' font-weight='{peso}' fill='{color}' text-anchor='{anchor}'>{escape(str(s))}</text>"


def caja(x, y, w, h, rol, radio=6):
    c = COLORES[rol]
    return f"<rect x='{x}' y='{y}' width='{w}' height='{h}' rx='{radio}' fill='{c}' fill-opacity='0.16' stroke='{c}' stroke-width='1.5'/>"


def diagrama(ruta, titulo, subtitulo, grupos, filas, formula, resultado, ancho=900):
    """grupos: [(texto, rol, etiqueta)]; filas: [(nombre, [valores por columna], rol_por_columna o None)]"""
    partes = []
    y = 40
    partes.append(t(32, y, titulo, 22, peso="700"))
    partes.append(t(32, y + 24, subtitulo, 14, TENUE))
    # Tira con el número partido por roles
    celda, gap, x = 42, 4, 32
    y_tira = 100
    for i, (texto, rol, etiqueta) in enumerate(grupos):
        x0 = x
        for ch in texto:
            partes.append(caja(x, y_tira, celda, 50, rol))
            partes.append(t(x + celda / 2, y_tira + 33, ch, 22, TEXTO, "middle", True, "600"))
            x += celda + gap
        x1 = x - gap
        c = COLORES[rol]
        # Etiquetas en dos alturas alternadas para que las de grupos angostos no se encimen
        baja = 22 * (i % 2)
        partes.append(f"<path d='M{x0} {y_tira + 60} v8 H{x1} v-8 M{(x0 + x1) / 2} {y_tira + 68} v{6 + baja}' fill='none' stroke='{c}' stroke-width='1.5'/>")
        partes.append(t((x0 + x1) / 2, y_tira + 90 + baja, etiqueta, 13, c, "middle", peso="600"))
        x += 10
    ancho = max(ancho, int(x + 22))
    # Leyenda de colores
    y_ley = y_tira + 150
    lx = 32
    for rol in dict.fromkeys(r for _, r, _ in grupos):
        partes.append(caja(lx, y_ley - 12, 14, 14, rol, 3))
        partes.append(t(lx + 22, y_ley, LEYENDA[rol], 13, TENUE))
        lx += 40 + 8 * len(LEYENDA[rol])
    # Panel de cálculo: columnas según el nombre de fila más largo
    col0 = 44 + 7 * max(len(str(f[0])) for f in filas) + 36
    colw = 40
    ancho = max(ancho, int(col0 + colw * max(len(f[1]) for f in filas) + 40))
    y_pan = y_ley + 30
    alto_pan = 60 + 34 * len(filas) + 80
    partes.append(f"<rect x='24' y='{y_pan}' width='{ancho - 48}' height='{alto_pan}' rx='10' fill='{PANEL}' stroke='{BORDE}'/>")
    partes.append(t(44, y_pan + 32, "Cálculo del dígito verificador", 15, TEXTO, peso="700"))
    for i, (nombre, valores, roles) in enumerate(filas):
        yy = y_pan + 70 + i * 34
        partes.append(t(44, yy, nombre, 13, TENUE))
        for j, v in enumerate(valores):
            cx = col0 + j * colw
            if roles and roles[j]:
                partes.append(caja(cx - 16, yy - 20, 32, 28, roles[j], 4))
            partes.append(t(cx, yy, v, 15, TEXTO, "middle", True))
    yf = y_pan + 70 + len(filas) * 34 + 10
    partes.append(t(44, yf, formula, 14, TENUE, mono=True))
    partes.append(caja(44, yf + 16, ancho - 136, 36, "verificador"))
    partes.append(t(60, yf + 40, resultado, 15, TEXTO, mono=True, peso="600"))
    alto = y_pan + alto_pan + 24
    svg = (f"<svg xmlns='http://www.w3.org/2000/svg' width='{ancho}' height='{alto}' viewBox='0 0 {ancho} {alto}' role='img' aria-label='{escape(titulo)}'>"
           f"<rect width='{ancho}' height='{alto}' rx='14' fill='{FONDO}'/>" + "".join(partes) + "</svg>\n")
    open(ruta, "w", encoding="utf-8").write(svg)




def luhn(numero):
    pasos = []
    for i, c in enumerate(numero):
        d = int(c)
        dup = (len(numero) - 1 - i) % 2 == 1
        v = d * 2 - 9 if dup and d * 2 > 9 else d * 2 if dup else d
        pasos.append((d, dup, v))
    return pasos, sum(v for _, _, v in pasos)


def tarjeta(ruta, numero, marca, titulo):
    pasos, suma = luhn(numero)
    assert suma % 10 == 0, (numero, suma)
    dv = (10 - luhn(numero[:-1] + "0")[1] % 10) % 10
    assert dv == int(numero[-1])
    diagrama(ruta, titulo, f"Número de prueba {numero} ({len(numero)} dígitos, {marca})",
             [(numero[0], "tipo", "MII"), (numero[1:6], "origen", f"Resto del IIN: {marca}"),
              (numero[6:-1], "secuencia", "Número de cuenta"), (numero[-1], "verificador", "Verificador")],
             [("Dígito", [d for d, _, _ in pasos], None),
              ("¿Se duplica?", ["x2" if dup else "" for _, dup, _ in pasos], None),
              ("Valor", [v for _, _, v in pasos], ["verificador" if dup else None for _, dup, _ in pasos])],
             f"suma = {' + '.join(str(v) for _, _, v in pasos)} = {suma}",
             f"{suma} mod 10 = 0: pasa Luhn   (verificador esperado para el cuerpo: {dv})", ancho=900)


tarjeta("docs/luhn-visa.svg", "4242424242424242", "Visa", "Tarjeta de 16 dígitos: Visa")
tarjeta("docs/luhn-amex.svg", "378282246310005", "American Express", "Tarjeta de 15 dígitos: American Express")
print("ok: 2 diagramas, Luhn verificado")
