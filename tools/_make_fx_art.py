#!/usr/bin/env python3
"""MARBLE RUSH §9.6 — original, hand-authored procedural VFX artwork.
Ten unique transparent PNGs, with no borrowed or unapproved imagery.
This script is used by a one-time art-only GitHub Actions importer.
"""
import math
import random
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

random.seed(726117)
ROOT=Path("assets/raw")
ROOT.mkdir(parents=True,exist_ok=True)
S=1024

def new(w=S,h=S):return Image.new("RGBA",(w,h),(0,0,0,0))
def drawmask(sz):return Image.new("L",sz,0)
def add_mask(canvas,mask,colour,blur=0,opacity=1.0):
    if blur:mask=mask.filter(ImageFilter.GaussianBlur(blur))
    if opacity!=1.0:mask=mask.point(lambda v:round(v*opacity))
    layer=Image.new("RGBA",canvas.size,colour)
    layer.putalpha(mask)
    canvas.alpha_composite(layer)
def glow(canvas,x,y,r,colour=(255,216,125),strength=0.6,ellipse=(1.0,1.0)):
    w,h=canvas.size
    ys,xs=np.ogrid[:h,:w]
    dist2=((xs-x)/(r*ellipse[0]))**2+((ys-y)/(r*ellipse[1]))**2
    a=np.uint8(np.clip(255*strength*np.exp(-dist2*3.2),0,255))
    pixels=np.empty((h,w,4),dtype=np.uint8)
    pixels[:,:,:3]=colour
    pixels[:,:,3]=a
    canvas.alpha_composite(Image.fromarray(pixels,"RGBA"))
def cubic(p0,p1,p2,p3,steps=60):
    out=[]
    for k in range(steps+1):
        t=k/steps;q=1-t
        out.append((q**3*p0[0]+3*q*q*t*p1[0]+3*q*t*t*p2[0]+t**3*p3[0],
                    q**3*p0[1]+3*q*q*t*p1[1]+3*q*t*t*p2[1]+t**3*p3[1]))
    return out
def stars(cx,cy,r,inner=None,arms=4,angle=-math.pi/2):
    inner=inner if inner is not None else r*0.115
    pts=[]
    for i in range(2*arms):
        a=angle+math.pi*i/arms
        rr=r if i%2==0 else inner
        pts.append((cx+math.cos(a)*rr,cy+math.sin(a)*rr))
    return pts
def save(img,name):
    # Glow and smoke tails should never touch transparent texture edges.
    # Normalize only effects whose faint visible alpha extends too near a border.
    w,h=img.size
    bounds=img.getchannel("A").getbbox()
    if bounds is not None:
        margin=min(bounds[0],bounds[1],w-bounds[2],h-bounds[3])
        if margin<82:
            subject=img.crop(bounds)
            maxw,maxh=w-180,h-180
            f=min(maxw/subject.width,maxh/subject.height,1.0)
            sz=(max(1,round(subject.width*f)),max(1,round(subject.height*f)))
            subject=subject.resize(sz,Image.Resampling.LANCZOS)
            safe=new(w,h)
            safe.alpha_composite(subject,((w-sz[0])//2,(h-sz[1])//2))
            img=safe
    dest=ROOT/(name+".png")
    img.save(dest,"PNG",optimize=True)
    verify=Image.open(dest);verify.load()
    assert verify.mode=="RGBA"
    expect=(1536,1024) if name=="fx_wind" else (1024,1024)
    assert verify.size==expect,(name,verify.size)
    alpha=verify.getchannel("A")
    assert alpha.getextrema()[0]==0 and alpha.getextrema()[1]>=90,(name,alpha.getextrema())
    bbox=alpha.getbbox()
    assert bbox is not None
    margin=min(bbox[0],bbox[1],expect[0]-bbox[2],expect[1]-bbox[3])
    assert margin>=28,(name,margin)
    assert dest.stat().st_size>12000,(name,dest.stat().st_size)
    print(f"PASS: {name}.png {expect} RGBA alpha={alpha.getextrema()} edge={margin}px {dest.stat().st_size} bytes",flush=True)

# 1. A single precise four-point champagne-gold star with white hot core.
im=new();glow(im,512,512,345,(255,206,104),.53)
m=drawmask(im.size);d=ImageDraw.Draw(m)
d.polygon(stars(512,512,345,26,4),fill=248)
add_mask(im,m,(255,191,77),55,.65)
m=drawmask(im.size);d=ImageDraw.Draw(m)
d.polygon(stars(512,512,320,22,4),fill=255)
add_mask(im,m,(255,230,155),7,.88)
m=drawmask(im.size);ImageDraw.Draw(m).polygon(stars(512,512,257,10,4),fill=255)
add_mask(im,m,(255,250,217),0,.98)
glow(im,512,512,113,(255,255,240),.83)
ImageDraw.Draw(im).ellipse((478,478,546,546),fill=(255,255,247,240))
save(im,"fx_sparkle")

# 2. Warm softly diffuse, transparent-edged circular glow.
w=h=S
yy,xx=np.ogrid[:h,:w]
rad=np.sqrt(((xx-512)/480)**2+((yy-512)/480)**2)
a=np.clip(190*np.exp(-5.4*rad**2)*(1-np.clip((rad-.75)/.23,0,1)),0,255)
pixels=np.zeros((h,w,4),np.uint8)
pixels[:,:,0]=255
pixels[:,:,1]=np.uint8(np.clip(177+76*np.exp(-rad*2),0,255))
pixels[:,:,2]=np.uint8(np.clip(68+98*np.exp(-rad*3),0,255))
pixels[:,:,3]=np.uint8(a)
save(Image.fromarray(pixels,"RGBA"),"fx_glow")

# 3. A short angled white-hot metal spark, tapered orange plume and microglints.
im=new();glow(im,520,514,280,(255,126,40),.26,ellipse=(1.35,.55))
pts=cubic((235,680),(382,602),(643,396),(805,286))
for width,colour,blur,opacity in [(104,(240,84,20),50,.41),(51,(255,153,45),19,.84),(24,(255,215,117),4,.94),(9,(255,255,235),0,1)]:
    m=drawmask(im.size);ImageDraw.Draw(m).line(pts,fill=255,width=width,joint="curve")
    add_mask(im,m,colour,blur,opacity)
for x,y,r in [(295,635,19),(747,326,14),(860,284,12),(305,733,10)]:
    glow(im,x,y,r*3,(255,157,48),.39)
    ImageDraw.Draw(im).ellipse((x-r/2,y-r/2,x+r/2,y+r/2),fill=(255,245,185,225))
save(im,"fx_spark")

# 4. A warm beige dust-puff plume made from semi-transparent rounded vapour.
im=new()
puffs=[(322,590,142),(439,486,158),(545,535,188),(665,575,152),(769,630,106),(435,674,115)]
for i,(x,y,r) in enumerate(puffs):
    glow(im,x,y,r*1.8,(191,157,116),.21,ellipse=(1.05,.9))
    m=drawmask(im.size)
    ImageDraw.Draw(m).ellipse((x-r,y-r*.9,x+r,y+r*.9),fill=155)
    add_mask(im,m,(223+(i%2)*9,202+(i%2)*7,168+(i%2)*9),32,.54)
    m=drawmask(im.size);ImageDraw.Draw(m).ellipse((x-r*.67,y-r*.62,x+r*.67,y+r*.62),fill=240)
    add_mask(im,m,(238,224,197),24,.22)
for x,y,r in [(258,730,22),(790,552,13),(333,437,17)]:
    glow(im,x,y,r*3,(231,201,160),.21)
save(im,"fx_dust")

# 5. Exactly five colourful rounded luxury candy sprinkles — close compact cluster.
im=new()
candies=[(404,427,21,"#f45570"),(561,385,-30,"#4ac6d6"),(635,558,42,"#e8bf54"),
         (464,628,-36,"#75cb9a"),(353,552,60,"#b598ec")]
for x,y,ang,c in candies:
    tile=new(196,76)
    shadow=drawmask(tile.size);ds=ImageDraw.Draw(shadow)
    ds.rounded_rectangle((22,18,175,62),radius=21,fill=190)
    add_mask(tile,shadow,(8,25,40),10,.27)
    d=ImageDraw.Draw(tile)
    rgb=tuple(bytes.fromhex(c.lstrip("#")))
    d.rounded_rectangle((18,11,170,55),radius=21,fill=rgb+(248,))
    d.rounded_rectangle((31,15,155,25),radius=6,fill=(255,255,255,94))
    d.arc((20,12,169,54),5,170,fill=(255,255,255,128),width=2)
    tile=tile.rotate(ang,Image.Resampling.BICUBIC,expand=True)
    im.alpha_composite(tile,(int(x-tile.width/2),int(y-tile.height/2)))
save(im,"fx_sprinkle")

# 6. Pale icy puff with luminous six-arm frost crystals.
im=new()
for x,y,r in [(410,579,172),(559,572,201),(679,629,132)]:
    glow(im,x,y,r*1.7,(153,212,247),.24)
    m=drawmask(im.size)
    ImageDraw.Draw(m).ellipse((x-r,y-r*.78,x+r,y+r*.78),fill=180)
    add_mask(im,m,(213,239,253),35,.56)
def ice_star(im,x,y,length,alpha=230):
    d=ImageDraw.Draw(im)
    for i in range(6):
        a=i*math.pi/3
        v=(math.cos(a),math.sin(a))
        end=(x+v[0]*length,y+v[1]*length)
        d.line([(x,y),end],fill=(236,250,255,alpha),width=5)
        for t in (.58,.78):
            base=(x+v[0]*length*t,y+v[1]*length*t)
            for sign in (-1,1):
                b=a+sign*math.pi/4
                tip=(base[0]-math.cos(b)*length*.18,base[1]-math.sin(b)*length*.18)
                d.line([base,tip],fill=(220,244,255,alpha),width=3)
for x,y,size in [(412,496,80),(645,544,99),(529,697,62),(343,662,37)]:
    glow(im,x,y,size*2,(181,226,255),.25)
    ice_star(im,x,y,size)
save(im,"fx_frost")

# 7. A single chocolate splash crown, rounded droplets and curved liquid highlights.
im=new();mask=drawmask(im.size);d=ImageDraw.Draw(mask)
outline=[(225,752)]
outline+=cubic((225,752),(231,690),(259,612),(294,620))[1:]
outline+=cubic((294,620),(325,628),(305,448),(358,414))[1:]
outline+=cubic((358,414),(397,396),(406,631),(447,610))[1:]
outline+=cubic((447,610),(473,592),(490,312),(528,328))[1:]
outline+=cubic((528,328),(564,328),(567,599),(602,607))[1:]
outline+=cubic((602,607),(642,612),(690,421),(720,445))[1:]
outline+=cubic((720,445),(760,480),(746,663),(779,666))[1:]
outline+=cubic((779,666),(807,665),(839,730),(839,752))[1:]
outline+=cubic((839,752),(797,846),(275,847),(225,752))[1:]
d.polygon(outline,fill=255)
d.ellipse((220,710,847,849),fill=255)
add_mask(im,mask,(75,33,22),24,.45)
# Build rich glossy brown gradient within the crown mask.
y,x=np.ogrid[:S,:S]
shade=.60+.30*np.clip((820-y)/520,0,1)+.08*np.sin(x*.019)
shade=np.broadcast_to(shade,(S,S))
arr=np.zeros((S,S,4),np.uint8)
arr[:,:,0]=np.uint8(np.clip(97*shade+26,0,255))
arr[:,:,1]=np.uint8(np.clip(53*shade+9,0,255))
arr[:,:,2]=np.uint8(np.clip(33*shade+6,0,255))
arr[:,:,3]=np.asarray(mask,np.uint8)
im.alpha_composite(Image.fromarray(arr,"RGBA"))
d=ImageDraw.Draw(im)
for x,y,r in [(331,377,28),(515,278,30),(731,392,23),(791,582,17)]:
    d.ellipse((x-r,y-r,x+r,y+r),fill=(118,58,30,230))
    d.arc((x-r+6,y-r+6,x+r-6,y+r-6),196,290,fill=(254,180,101,165),width=5)
d.arc((302,678,773,809),185,332,fill=(255,179,109,114),width=16)
d.arc((338,690,690,805),170,300,fill=(255,214,145,85),width=5)
save(im,"fx_splash")

# 8. Delicate creamy-violet respawn poof, small warm star sparks.
im=new()
for i,(x,y,r) in enumerate([(326,588,141),(405,459,140),(542,432,166),(663,503,141),(731,624,112),(526,683,190)]):
    glow(im,x,y,r*1.8,(206,175,234),.16)
    m=drawmask(im.size);ImageDraw.Draw(m).ellipse((x-r,y-r,x+r,y+r),fill=212)
    add_mask(im,m,(238,232,248) if i%2 else (255,242,238),32,.54)
    m=drawmask(im.size);ImageDraw.Draw(m).ellipse((x-r*.75,y-r*.72,x+r*.75,y+r*.72),fill=168)
    add_mask(im,m,(255,255,255),19,.24)
for x,y,r in [(251,401,28),(764,407,19),(312,732,18),(734,741,22)]:
    glow(im,x,y,85,(248,201,109),.28)
    m=drawmask(im.size);ImageDraw.Draw(m).polygon(stars(x,y,r,r*.22),fill=255)
    add_mask(im,m,(255,223,156))
save(im,"fx_poof")

# 9. Firework burst of discrete ruby-red and gold star-rays.
im=new()
glow(im,512,512,255,(248,163,72),.21)
d=ImageDraw.Draw(im)
for i in range(18):
    a=2*math.pi*i/18-math.pi/2
    r=165+(i%4)*18
    end=310+(i%3)*22
    inner=(512+math.cos(a)*r,512+math.sin(a)*r)
    outer=(512+math.cos(a)*end,512+math.sin(a)*end)
    c=(255,209,106,226) if i%2 else (244,63,93,235)
    d.line([inner,outer],fill=c,width=9 if i%3 else 13)
    d.ellipse((outer[0]-9,outer[1]-9,outer[0]+9,outer[1]+9),fill=c)
for i in range(13):
    a=i*2.3999632
    r=165+(i*47)%204
    x=512+math.cos(a)*r;y=512+math.sin(a)*r
    rr=21+(i%3)*8
    col=(255,225,148) if i%2 else (255,104,125)
    glow(im,x,y,rr*2,col,.22)
    m=drawmask(im.size);ImageDraw.Draw(m).polygon(stars(x,y,rr,rr*.18),fill=255)
    add_mask(im,m,col,2,.9)
m=drawmask(im.size);ImageDraw.Draw(m).polygon(stars(512,512,122,14,8),fill=255)
add_mask(im,m,(255,194,109),18,.72)
m=drawmask(im.size);ImageDraw.Draw(m).polygon(stars(512,512,98,10,8),fill=255)
add_mask(im,m,(255,235,184),2)
glow(im,512,512,96,(255,249,210),.65)
save(im,"fx_star_burst")

# 10. Low-opacity horizontal wind ribbons, tapered and faded at both ends.
im=new(1536,1024);rng=random.Random(196)
curves=[
 ((125,420),(475,245),(915,610),(1410,415),20,.65),
 ((198,553),(545,422),(996,746),(1371,529),13,.55),
 ((230,664),(482,527),(1068,832),(1417,616),11,.45),
 ((215,354),(635,253),(1100,545),(1307,377),7,.38),
 ((305,745),(620,625),(923,817),(1220,735),6,.37)
]
for p0,p1,p2,p3,thick,op in curves:
    points=cubic(p0,p1,p2,p3,115)
    mask=drawmask(im.size)
    ImageDraw.Draw(mask).line(points,fill=255,width=thick*4,joint="curve")
    add_mask(im,mask,(185,228,255),32,op*.28)
    mask=drawmask(im.size)
    ImageDraw.Draw(mask).line(points,fill=255,width=thick*2,joint="curve")
    add_mask(im,mask,(207,241,255),11,op*.48)
    mask=drawmask(im.size)
    ImageDraw.Draw(mask).line(points,fill=255,width=max(2,thick//2),joint="curve")
    add_mask(im,mask,(255,255,251),2,op*.84)
# Force transparent ends using a smooth horizontal alpha envelope.
pix=np.asarray(im).copy();x=np.arange(1536,dtype=np.float32)
fade=np.minimum(np.clip((x-92)/195,0,1),np.clip((1458-x)/210,0,1))
fade=fade**1.7
pix[:,:,3]=np.uint8(np.clip(pix[:,:,3].astype(np.float32)*fade[None,:],0,255))
im=Image.fromarray(pix,"RGBA")
save(im,"fx_wind")

print("PASS: exactly ten original alpha-transparent FX textures created; no outside image sources",flush=True)
