"""Copia una región de un PNG sobre otra (paleta Kenney). Sin PIL: PNG 8-bit RGB/RGBA no entrelazado."""
import struct, zlib, sys

def read_png(path):
    d = open(path, 'rb').read(); assert d[:8] == b'\x89PNG\r\n\x1a\n'
    pos, idat, ihdr = 8, b'', None
    while pos < len(d):
        ln, = struct.unpack('>I', d[pos:pos+4]); typ = d[pos+4:pos+8]; body = d[pos+8:pos+8+ln]; pos += 12 + ln
        if typ == b'IHDR': ihdr = struct.unpack('>IIBBBBB', body)
        elif typ == b'IDAT': idat += body
    w, h, depth, ctype, _, _, interlace = ihdr
    assert depth == 8 and interlace == 0 and ctype in (2, 6), ihdr
    bpp = 3 if ctype == 2 else 4
    raw = zlib.decompress(idat); stride = w * bpp
    rows, prev = [], bytearray(stride)
    for y in range(h):
        f = raw[y*(stride+1)]; line = bytearray(raw[y*(stride+1)+1:(y+1)*(stride+1)])
        for i in range(stride):
            a = line[i-bpp] if i >= bpp else 0; b = prev[i]; c = prev[i-bpp] if i >= bpp else 0
            if f == 1: line[i] = (line[i] + a) & 255
            elif f == 2: line[i] = (line[i] + b) & 255
            elif f == 3: line[i] = (line[i] + (a + b)//2) & 255
            elif f == 4:
                p = a + b - c; pa, pb, pc = abs(p-a), abs(p-b), abs(p-c)
                line[i] = (line[i] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        rows.append(line); prev = line
    return w, h, bpp, rows

def write_png(path, w, h, bpp, rows):
    raw = b''.join(b'\x00' + bytes(r) for r in rows)
    def chunk(t, b): return struct.pack('>I', len(b)) + t + b + struct.pack('>I', zlib.crc32(t + b) & 0xffffffff)
    ihdr = struct.pack('>IIBBBBB', w, h, 8, 2 if bpp == 3 else 6, 0, 0, 0)
    open(path, 'wb').write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))

src, dst, sx, sy, dx, dy, cw, ch = sys.argv[1], sys.argv[2], *map(int, sys.argv[3:9])
w, h, bpp, rows = read_png(src)
for y in range(ch):
    rows[dy+y][dx*bpp:(dx+cw)*bpp] = rows[sy+y][sx*bpp:(sx+cw)*bpp]
write_png(dst, w, h, bpp, rows)
print(f"{dst}: copiada región {cw}x{ch} de ({sx},{sy}) a ({dx},{dy})")
