goog.provide('og.utils.FontsAtlas');

goog.require('og.utils.TextureAtlas');
goog.require('og.ImageCanvas');
goog.require('og.math');

og.utils.FontsAtlas = function () {
    this.atlasesArr = [];
    this.atlasIndexes = {};
    this.tokenImageSize = 64;
};

og.utils.FontsAtlas.tokens = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
'�', '�', '�', '�', '�', '�', '�', '�', '�', '�', '�', '�', '�', '�', '�', '�', '�', '�', '�', '�', '�', '�', '�', '�', '�', '�', '�', '�', '�', '�', '�',
'�', '�', '�', '�', '�', '�', '�', '�', '�', '�', '�', '�', '�', '�', '�', '�', '�', '�', '�', '�', '�', '�', '�', '�', '�', '�', '�', '�', '�', '�', '�',
'1', '2', '3', '4', '5', '6', '7', '8', '9', '0',
'`', '!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+', '-', '=', '[', ']', '{', '}', '\\', '|', ';', ':', '"', ',', '.', '/', '<', '>', '?', ' ', '    '];

og.utils.FontsAtlas.prototype.getFontIndex = function (face, style, weight) {
    return this.atlasIndexes[og.utils.FontsAtlas.getFullIndex(face, style, weight)];
};

og.utils.utils.FontsAtlas.getFullIndex = function (face, style, weight) {
    return (face.toLowerCase() + " " + ((style && style.toLowerCase()) || "normal") + " " + ((weight && weight.toLowerCase()) || "normal"));
};

og.utils.FontsAtlas.prototype.getTokenNode = function (token, face, style, weight) {
    var fn = og.FontsAtlas.getFullIndex(face, style, weight);
    var ai = this.atlasIndexes[fn];
    var n = this.atlasesArr[ai].nodes[token];
    return n;
};

og.utils.FontsAtlas.prototype.createFont = function (face, style, weight) {
    if (!this.getFontIndex(face, style, weight)) {
        var tis = this.tokenImageSize;
        var atlasSize = og.math.nextHighestPowerOfTwo(Math.ceil(Math.sqrt(og.utils.FontsAtlas.tokens.length)) / tis + (og.utils.FontsAtlas.tokens.length - 1) * og.utils.TextureAtlas.BORDER_SIZE);
        var fn = og.utils.FontsAtlas.getFullIndex(face, style, weight);
        this.atlasIndexes[fn] = this.atlasesArr.length;
        var atlas = new og.utils.TextureAtlas(atlasSize, atlasSize);
        this.atlasesArr.push(atlas);

        var canvas = new og.ImageCanvas(tis, tis);
        var cY = Math.round(tis * 0.5);
        var pT = Math.round(cY * 1.5);
        var tF = (style || "normal") + " " + (weight || "normal") + " " + pT + "px " + face;
        var t = og.utils.FontsAtlas.tokens;

        for (var i = 0; i < t.length; i++) {
            var ti = t[i];
            canvas.fillEmpty();
            canvas.drawText(ti, 3, pT, tF);

            var img = canvas.getImage();
            img.__nodeIndex = ti;
            var n = atlas.addImage(img);

            var tokenWidth = canvas.getTextWidth(ti);
            n.emptySize = (tis - tokenWidth - 3) / tis;
        }
    }
};

