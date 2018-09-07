/**
 * Converts style information from arcgis.com into a format compatible with the symbolizer
 * The symbolizer converts the object to an actual ol style
 */
import Symbolizer = require("./ol3-symbolizer");
import { Format } from "./@types/formats";

import { ArcGisFeatureServerLayer } from "./@types/ArcGisFeatureServerLayer";

const symbolizer = new Symbolizer.StyleConverter();

// esri -> ol mappings (add keyof to get proper definitions, not sure how)
// function agsStyleMapper(index : keyof(StyleTypes)) {
// }
const styleMap = {
    esriSMSCircle: "circle",
    esriSMSDiamond: "diamond",
    esriSMSX: "x",
    esriSMSCross: "cross",
    esriSLSSolid: "solid",
    esriSFSSolid: "solid",
    esriSLSDot: "dot",
    esriSLSDash: "dash",
    esriSLSDashDot: "dashdot",
    esriSLSDashDotDot: "dashdotdot",
    esriSFSBackwardDiagonal: "backward-diagonal",
    esriSFSForwardDiagonal: "forward-diagonal"
};

// esri -> ol mappings
const typeMap = {
    esriSMS: "sms", // simple marker symbol
    esriSLS: "sls", // simple line symbol
    esriSFS: "sfs", // simple fill symbol
    esriPMS: "pms", // picture marker symbol
    esriPFS: "pfs", // picture fill symbol
    esriTS: "txt" // text symbol
};

function range(a: number, b: number) {
    let result = new Array(b - a + 1);
    while (a <= b) result.push(a++);
    return result;
}

function clone(o: Object) {
    return JSON.parse(JSON.stringify(o));
}

// convert from ags style to an internal format
export class StyleConverter {
    private asWidth(v: number) {
        return (v * 4) / 3; // not sure why
    }

    // see ol.color.asString
    private asColor(color: ArcGisFeatureServerLayer.Color) {
        if (color.length === 4) return `rgba(${color[0]},${color[1]},${color[2]},${color[3] / 255})`;
        if (color.length === 3) return `rgb(${color[0]},${color[1]},${color[2]}})`;
        return "#" + color.map((v) => ("0" + v.toString(16)).substr(0, 2)).join("");
    }

    private fromSFSSolid(symbol: ArcGisFeatureServerLayer.Symbol, style: Format.Style) {
        style.fill = {
            color: this.asColor(symbol.color)
        };
        this.fromSLS(symbol.outline, style);
    }

    private fromSFSForwardDiagonal(symbol: ArcGisFeatureServerLayer.Symbol, style: Format.Style) {
        style.fill = {
            pattern: {
                color: this.asColor(symbol.color),
                orientation: "forward",
                spacing: 3,
                repitition: "repeat"
            }
        };
        this.fromSLS(symbol.outline, style);
    }

    private fromSFSBackwardDiagonal(symbol: ArcGisFeatureServerLayer.Symbol, style: Format.Style) {
        style.fill = {
            pattern: {
                color: this.asColor(symbol.color),
                orientation: "backward",
                spacing: 3,
                repitition: "repeat"
            }
        };
        this.fromSLS(symbol.outline, style);
    }

    private fromSFS(symbol: ArcGisFeatureServerLayer.Symbol, style: Format.Style) {
        switch (symbol.style) {
            case "esriSFSSolid":
                this.fromSFSSolid(symbol, style);
                break;
            case "esriSFSForwardDiagonal":
                this.fromSFSForwardDiagonal(symbol, style);
                break;
            case "esriSFSBackwardDiagonal":
                this.fromSFSBackwardDiagonal(symbol, style);
                break;
            default:
                throw `invalid-style: ${symbol.style}`;
        }
    }

    private fromSMSCircle(symbol: ArcGisFeatureServerLayer.Symbol, style: Format.Style) {
        style.circle = {
            opacity: 1,
            radius: this.asWidth(symbol.size / 2),
            stroke: {
                color: this.asColor(symbol.outline.color)
            },
            snapToPixel: true
        };
        this.fromSFSSolid(symbol, style.circle);
        this.fromSLS(symbol.outline, style.circle);
    }

    private fromSMSCross(symbol: ArcGisFeatureServerLayer.Symbol, style: Format.Style) {
        style.star = {
            points: 4,
            angle: 0,
            radius: this.asWidth(symbol.size / Math.sqrt(2)),
            radius2: 0
        };
        this.fromSFSSolid(symbol, style.star);
        this.fromSLS(symbol.outline, style.star);
    }

    private fromSMSDiamond(symbol: ArcGisFeatureServerLayer.Symbol, style: Format.Style) {
        style.star = {
            points: 4,
            angle: 0,
            radius: this.asWidth(symbol.size / Math.sqrt(2)),
            radius2: this.asWidth(symbol.size / Math.sqrt(2))
        };
        this.fromSFSSolid(symbol, style.star);
        this.fromSLS(symbol.outline, style.star);
    }

    private fromSMSPath(symbol: ArcGisFeatureServerLayer.Symbol, style: Format.Style) {
        let size = 2 * this.asWidth(symbol.size);
        style.svg = {
            imgSize: [size, size],
            path: symbol.path,
            rotation: symbol.angle
        };
        this.fromSLSSolid(symbol, style.svg);
        this.fromSLS(symbol.outline, style.svg);
    }

    private fromSMSSquare(symbol: ArcGisFeatureServerLayer.Symbol, style: Format.Style) {
        style.star = {
            points: 4,
            angle: Math.PI / 4,
            radius: this.asWidth(symbol.size / Math.sqrt(2)),
            radius2: this.asWidth(symbol.size / Math.sqrt(2))
        };
        this.fromSFSSolid(symbol, style.star);
        this.fromSLS(symbol.outline, style.star);
    }

    private fromSMSX(symbol: ArcGisFeatureServerLayer.Symbol, style: Format.Style) {
        style.star = {
            points: 4,
            angle: Math.PI / 4,
            radius: this.asWidth(symbol.size / Math.sqrt(2)),
            radius2: 0
        };
        this.fromSFSSolid(symbol, style.star);
        this.fromSLS(symbol.outline, style.star);
    }

    private fromSMS(symbol: ArcGisFeatureServerLayer.Symbol, style: Format.Style) {
        switch (symbol.style) {
            case "esriSMSCircle":
                this.fromSMSCircle(symbol, style);
                break;
            case "esriSMSCross":
                this.fromSMSCross(symbol, style);
                break;
            case "esriSMSDiamond":
                this.fromSMSDiamond(symbol, style);
                break;
            case "esriSMSPath":
                this.fromSMSPath(symbol, style);
                break;
            case "esriSMSSquare":
                this.fromSMSSquare(symbol, style);
                break;
            case "esriSMSX":
                this.fromSMSX(symbol, style);
                break;
            default:
                throw `invalid-style: ${symbol.style}`;
        }
    }

    private fromPMS(symbol: ArcGisFeatureServerLayer.Symbol, style: Format.Style) {
        style.image = {};
        style.image.src = symbol.url;
        if (symbol.imageData) {
            style.image.src = `data:image/png;base64,${symbol.imageData}`;
        }
        style.image["anchor-x"] = this.asWidth(symbol.xoffset);
        style.image["anchor-y"] = this.asWidth(symbol.yoffset);
        style.image.imgSize = [this.asWidth(symbol.width), this.asWidth(symbol.height)];
    }

    private fromSLSSolid(symbol: ArcGisFeatureServerLayer.Outline, style: Format.Style) {
        style.stroke = {
            color: this.asColor(symbol.color),
            width: this.asWidth(symbol.width),
            lineDash: [],
            lineJoin: "",
            miterLimit: 4
        };
    }

    private fromSLS(symbol: ArcGisFeatureServerLayer.Outline, style: Format.Style) {
        switch (symbol.style) {
            case "esriSLSSolid":
                this.fromSLSSolid(symbol, style);
                break;

            case "esriSLSDot":
                this.fromSLSSolid(symbol, style);
                break;

            case "esriSLSDash":
                this.fromSLSSolid(symbol, style);
                break;

            case "esriSLSDashDot":
                this.fromSLSSolid(symbol, style);
                break;

            case "esriSLSDashDotDot":
                this.fromSLSSolid(symbol, style);
                break;

            default:
                this.fromSLSSolid(symbol, style);
                console.warn(`invalid-style: ${symbol.style}`);
                break;
        }
    }

    // picture fill symbol (does not render the picture due to drawPolygon limitation)
    private fromPFS(symbol: ArcGisFeatureServerLayer.Symbol, style: Format.Style) {
        // TODO drawPolygon does not call setImageStyle so this is being ignored
        style.fill = {
            image: {
                src: symbol.url,
                imageData: symbol.imageData && `data:image/png;base64,${symbol.imageData}`,
                "anchor-x": this.asWidth(symbol.xoffset),
                "anchor-y": this.asWidth(symbol.yoffset),
                imgSize: [this.asWidth(symbol.width), this.asWidth(symbol.height)]
            }
        };

        this.fromSLS(symbol.outline, style);
    }

    private fromTS(symbol: ArcGisFeatureServerLayer.Symbol, style: Format.Style) {
        throw "not-implemented";
    }

    /**
     * Converts the ags symbol to an openlayers style, then the openlayers style to a JSON representation
     */
    public fromJson(symbol: ArcGisFeatureServerLayer.Symbol) {
        let style = <Format.Style>{};
        this.fromSymbol(symbol, style);
        return symbolizer.fromJson(style);
    }

    private fromSymbol(symbol: ArcGisFeatureServerLayer.Symbol, style: Format.Style) {
        switch (symbol.type) {
            case "esriSFS":
                this.fromSFS(symbol, style);
                break;

            case "esriSLS":
                this.fromSLS(symbol, style);
                break;

            case "esriPMS":
                this.fromPMS(symbol, style);
                break;

            case "esriPFS":
                this.fromPFS(symbol, style);
                break;

            case "esriSMS":
                this.fromSMS(symbol, style);
                break;

            case "esriTS":
                this.fromTS(symbol, style);
                break;

            default:
                throw `invalid-symbol-type: ${symbol.type}`;
        }
    }

    /**
     * convert drawing info into a symbology rule
     */
    public fromRenderer(
        renderer: ArcGisFeatureServerLayer.Renderer,
        args: {
            url: string;
        }
    ) {
        switch (renderer.type) {
            case "simple": {
                return this.fromJson(renderer.symbol);
            }

            case "uniqueValue": {
                let styles = <{ [name: string]: ol.style.Style }>{};

                let defaultStyle = renderer.defaultSymbol && this.fromJson(renderer.defaultSymbol);

                if (renderer.uniqueValueInfos) {
                    renderer.uniqueValueInfos.forEach((info) => {
                        styles[info.value] = this.fromJson(info.symbol);
                    });
                }

                return (feature: ol.Feature) => styles[feature.get(renderer.field1)] || defaultStyle;
            }

            case "classBreaks": {
                let styles = <{ [name: number]: ol.style.Style }>{};
                let classBreakRenderer = <ArcGisFeatureServerLayer.ClassBreakRenderer>renderer;
                if (classBreakRenderer.classBreakInfos) {
                    console.log("processing classBreakInfos");
                    if (classBreakRenderer.visualVariables) {
                        classBreakRenderer.visualVariables.forEach((vars) => {
                            switch (vars.type) {
                                /**
                                 * This renderer adjusts the size of the symbol to between [minSize..maxSize]
                                 * based on the range of values [minDataValue, maxDataValue]
                                 */
                                case "sizeInfo": {
                                    let steps = range(
                                        classBreakRenderer.authoringInfo.visualVariables[0].minSliderValue,
                                        classBreakRenderer.authoringInfo.visualVariables[0].maxSliderValue
                                    );
                                    let dx = (vars.maxSize - vars.minSize) / steps.length;
                                    let dataValue = (vars.maxDataValue - vars.minDataValue) / steps.length;

                                    classBreakRenderer.classBreakInfos.forEach((classBreakInfo) => {
                                        let icons = steps.map((step) => {
                                            let json = <ArcGisFeatureServerLayer.Symbol>(
                                                JSON.parse(JSON.stringify(classBreakInfo.symbol))
                                            );
                                            json.size = vars.minSize + dx * (dataValue - vars.minDataValue);
                                            let style = this.fromJson(json);
                                            styles[dataValue] = style;
                                        });
                                    });
                                    debugger;
                                    break;
                                }
                                default:
                                    debugger;
                                    break;
                            }
                        });
                    }
                }
                return (feature: ol.Feature) => {
                    debugger;
                    let value = feature.get(renderer.field1);
                    for (var key in styles) {
                        // TODO: scan until key > value, return prior style
                        return styles[key];
                    }
                    return null;
                };
            }

            default:
                throw `unsupported renderer type: ${renderer.type}`;
        }
    }
}
