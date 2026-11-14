"""Extract selected members from a remote zip using HTTP range requests."""
import io, sys, urllib.request, zipfile

class RangeFile(io.RawIOBase):
    def __init__(self, url):
        req = urllib.request.Request(url, method="HEAD")
        with urllib.request.urlopen(req) as r:
            self.url = r.geturl()
            self.size = int(r.headers["Content-Length"])
        self.pos = 0
    def seekable(self): return True
    def readable(self): return True
    def tell(self): return self.pos
    def seek(self, off, whence=0):
        self.pos = off if whence == 0 else self.pos + off if whence == 1 else self.size + off
        return self.pos
    def readinto(self, b):
        n = min(len(b), self.size - self.pos)
        if n <= 0: return 0
        req = urllib.request.Request(self.url, headers={"Range": f"bytes={self.pos}-{self.pos+n-1}"})
        with urllib.request.urlopen(req) as r:
            data = r.read()
        b[:len(data)] = data
        self.pos += len(data)
        return len(data)

url, out = sys.argv[1], sys.argv[2]
want = sys.argv[3:]
f = io.BufferedReader(RangeFile(url), buffer_size=8 * 1024 * 1024)
z = zipfile.ZipFile(f)
names = z.namelist()
print("\n".join(n for n in names if "web" in n or "version" in n))
for n in names:
    if any(n.endswith(w) for w in want):
        z.extract(n, out)
        print("extracted", n)
