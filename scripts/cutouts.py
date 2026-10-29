# Background removal for the dancer photos (BiRefNet via rembg). Needs: pip install "rembg[cpu,cli]"
# usage: python scripts/cutouts.py birefnet-general-lite <outdir> media/figure/r4.jpg ...
import sys, os
from rembg import remove, new_session
model, outdir = sys.argv[1], sys.argv[2]
s = new_session(model)
for f in sys.argv[3:]:
    out = os.path.join(outdir, model + "_" + os.path.splitext(os.path.basename(f))[0] + ".png")
    res = remove(open(f,'rb').read(), session=s, post_process_mask=True)
    open(out,'wb').write(res); print(out)
