import ol = require("openlayers");
import Serializer = require("./@types/base");
import { assign } from "../common/assign";
import { mixin, doif } from "ol3-fun/index";

import { Format } from "./@types/formats";
import { Shapeshifter as CrossShapeshifter } from "./plugins/as-cross";
import { Shapeshifter as SquareShapeshifter } from "./plugins/as-square";
import { Shapeshifter as DiamondShapeshifter } from "./plugins/as-diamond";
import { Shapeshifter as TriangleShapeshifter } from "./plugins/as-triangle";
import { Shapeshifter as XShapeshifter } from "./plugins/as-x";

function getContext(canvas: HTMLCanvasElement) {
	let ctx = canvas.getContext("2d");
	if (!ctx) throw "unable to get 2d context";
	return ctx as CanvasRenderingContext2D;
}

// Class
interface Path2D {
	addPath(path: Path2D, transform?: SVGMatrix): void;
	closePath(): void;
	moveTo(x: number, y: number): void;
	lineTo(x: number, y: number): void;
	bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void;
	quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
	arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, anticlockwise?: boolean): void;
	arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void;
	/*ellipse(x: number, y: number, radiusX: number, radiusY: number, rotation: number, startAngle: number, endAngle: number, anticlockwise?: boolean): void;*/
	rect(x: number, y: number, w: number, h: number): void;
}

export class StyleConverter implements Serializer.IConverter<Format.Style> {
	private converters: Array<{
		is: (s: Format.Style) => boolean;
		as: (s: Format.Style) => Format.Style;
		inverse: (s: Format.Style) => Format.Style;
	}>;

	/**
	 * Register shape shifters
	 */
	constructor() {
		this.converters = [];
		this.converters.push(CrossShapeshifter);
		this.converters.push(SquareShapeshifter);
		this.converters.push(DiamondShapeshifter);
		this.converters.push(TriangleShapeshifter);
		this.converters.push(XShapeshifter);
		//this.converters.push(StarShapeshifter);
	}

	fromJson(json: Format.Style) {
		this.converters.some(c => c.is(json) && c.inverse && !!(json = c.inverse(json)));
		return this.deserializeStyle(json);
	}

	toJson(style: ol.style.Style) {
		// to be encoded as a collection of encoders, each in it's own module
		let result = this.serializeStyle(style);
		this.converters.some(c => c.is(result) && c.as && !!(result = c.as(result)));
		return result;
	}

	/**
	 * uses the interior point of a polygon when rendering a 'point' style
	 */
	public getGeometry(feature: ol.Feature | ol.render.Feature) {
		let geom = feature.getGeometry();
		if (geom instanceof ol.geom.Polygon) {
			geom = geom.getInteriorPoint();
		}
		return geom;
	}

	private serializeStyle(style: ol.style.Style & any): Format.Style {
		if (!style) throw "style require";
		let s = <Format.Style>{};

		if (typeof style === "string") throw style;
		if (typeof style === "number") throw style;

		if (style.getColor) mixin(s, this.serializeColor(style.getColor()));
		if (style.getImage) assign(s, "image", this.serializeImage(style.getImage()));
		if (style.getFill) assign(s, "fill", this.serializeFill(style.getFill()));
		if (style.getOpacity) assign(s, "opacity", style.getOpacity());
		if (style.getStroke) assign(s, "stroke", this.serializeStroke(style.getStroke()));
		if (style.getText) assign(s, "text", this.serializeText(style.getText()));
		if (style.getWidth) assign(s, "width", style.getWidth());
		if (style.getOffsetX) assign(s, "offset-x", style.getOffsetX());
		if (style.getOffsetY) assign(s, "offset-y", style.getOffsetY());
		if (style.getWidth) assign(s, "width", style.getWidth());
		if (style.getFont) assign(s, "font", style.getFont());
		if (style.getRadius) assign(s, "radius", style.getRadius());
		if (style.getRadius2) assign(s, "radius2", style.getRadius2());
		if (style.getPoints) assign(s, "points", style.getPoints());
		if (style.getAngle) assign(s, "angle", style.getAngle());
		if (style.getRotation) assign(s, "rotation", style.getRotation());
		if (style.getOrigin) assign(s, "origin", style.getOrigin());
		if (style.getScale) assign(s, "scale", style.getScale());
		if (style.getSize) assign(s, "size", style.getSize());

		if (style.getAnchor) {
			assign(s, "anchor", style.getAnchor());
			"anchorXUnits,anchorYUnits,anchorOrigin".split(",").forEach(k => {
				assign(s, k, style[`${k}_`]);
			});
		}

		// "svg"
		if (style.path) {
			if (style.path) assign(s, "path", style.path);
			if (style.getImageSize) assign(s, "imgSize", style.getImageSize());
			if (style.stroke) assign(s, "stroke", style.stroke);
			if (style.fill) assign(s, "fill", style.fill);
			if (style.scale) assign(s, "scale", style.scale); // getScale and getImgSize are modified in deserializer
			if (style.imgSize) assign(s, "imgSize", style.imgSize);
		}

		// "icon"
		if (style.getSrc) assign(s, "src", style.getSrc());

		return s;
	}

	private serializeImage(style: any) {
		if (!style) return null;
		if (typeof style === "string") throw style;
		if (typeof style === "number") throw style;
		return this.serializeStyle(style);
	}

	private serializeStroke(style: any) {
		if (!style) return null;
		if (typeof style === "string") throw style;
		if (typeof style === "number") throw style;
		return this.serializeStyle(style);
	}

	private serializeText(style: string) {
		return style;
	}

	private serializeColor(color: string | [number, number, number, number] | CanvasGradient | CanvasPattern): Object {
		if (color instanceof Array) {
			return {
				color: ol.color.asString(color)
			};
		} else if (color instanceof CanvasGradient) {
			return {
				gradient: color
			};
		} else if (color instanceof CanvasPattern) {
			return {
				pattern: color
			};
		} else if (typeof color === "string") {
			return {
				color: color
			};
		}
		throw "unknown color type";
	}

	private serializeFill(fill: ol.style.Fill) {
		if (!fill) return null;
		return this.serializeStyle(fill);
	}

	private deserializeStyle(json: Format.Style) {
		let image: ol.style.Image | undefined;
		let text: ol.style.Text | undefined;
		let fill: ol.style.Fill | undefined;
		let stroke: ol.style.Stroke | undefined;

		if (json.circle) image = this.deserializeCircle(json.circle);
		else if (json.star) image = this.deserializeStar(json.star);
		else if (json.icon) image = this.deserializeIcon(json.icon);
		else if (json.svg) image = this.deserializeSvg(json.svg);
		else if (json.image && (json.image.img || json.image.path)) image = this.deserializeSvg(json.image);
		else if (json.image && json.image.src) image = this.deserializeIcon(json.image);
		else if (json.image) throw "unknown image type";
		if (json.text) text = this.deserializeText(json.text);
		if (json.fill) fill = this.deserializeFill(json.fill);
		if (json.stroke) stroke = this.deserializeStroke(json.stroke);

		let s = new ol.style.Style({
			image: image,
			text: text,
			fill: fill,
			stroke: stroke
		});

		image && s.setGeometry(feature => this.getGeometry(feature));

		return s;
	}

	private deserializeText(json: Format.Text) {
		json.rotation = json.rotation || 0;
		json.scale = json.scale || 1;

		let [x, y] = [json["offset-x"] || 0, json["offset-y"] || 0];
		{
			let p = new ol.geom.Point([x, y]);
			p.rotate(json.rotation, [0, 0]);
			p.scale(json.scale, json.scale);
			[x, y] = p.getCoordinates();
		}

		return new ol.style.Text({
			fill: json.fill && this.deserializeFill(json.fill),
			stroke: json.stroke && this.deserializeStroke(json.stroke),
			text: json.text,
			font: json.font,
			offsetX: x,
			offsetY: y,
			rotation: json.rotation,
			scale: json.scale
		});
	}

	private deserializeCircle(json: Format.Circle) {
		let image = new ol.style.Circle({
			radius: json.radius,
			fill: json.fill && this.deserializeFill(json.fill),
			stroke: json.stroke && this.deserializeStroke(json.stroke)
		});
		image.setOpacity(json.opacity || 1);
		return image;
	}

	private deserializeStar(json: Format.Star) {
		let image = new ol.style.RegularShape({
			radius: json.radius || 10,
			radius2: json.radius2,
			points: json.points || 5,
			angle: json.angle,
			fill: json.fill && this.deserializeFill(json.fill),
			stroke: json.stroke && this.deserializeStroke(json.stroke)
		});

		doif(json.rotation, v => image.setRotation(v));
		doif(json.opacity, v => image.setOpacity(v));

		return image;
	}

	private deserializeIcon(json: Format.Icon) {
		if (!json.anchor) {
			json.anchor = [json["anchor-x"] || 0.5, json["anchor-y"] || 0.5];
		}

		let image = new ol.style.Icon(<any>{
			anchor: json.anchor || [0.5, 0.5],
			anchorOrigin: json.anchorOrigin || "top-left",
			anchorXUnits: json.anchorXUnits || "fraction",
			anchorYUnits: json.anchorYUnits || "fraction",
			//crossOrigin?: string;
			img: undefined,
			imgSize: undefined,
			offset: json.offset,
			offsetOrigin: json.offsetOrigin,
			opacity: json.opacity,
			scale: json.scale,
			snapToPixel: json.snapToPixel,
			rotateWithView: json.rotateWithView,
			rotation: json.rotation,
			size: json.size,
			src: json.src,
			color: json.color
		});
		image.load();
		return image;
	}

	private deserializeSvg(json: Partial<Format.Svg & Format.Icon>) {
		json.rotation = json.rotation || 0;
		json.scale = json.scale || 1;

		if (json.img) {
			let symbol = <SVGSymbolElement>(<any>document.getElementById(json.img));
			if (!symbol) {
				throw `unable to find svg element: ${json.img}`;
			}
			if (symbol) {
				// but just grab the path is probably good enough
				let path = <SVGPathElement>symbol.getElementsByTagName("path")[0];
				if (path) {
					if (symbol.viewBox) {
						if (!json.imgSize) {
							json.imgSize = [symbol.viewBox.baseVal.width, symbol.viewBox.baseVal.height];
						}
					}
					json.path = (json.path || "") + path.getAttribute("d");
				}
			}
		}

		let canvas = document.createElement("canvas");
		if (json.path) {
			{
				if (!json.imgSize) throw "imgSize require";
				// rotate a rectangle and get the resulting extent
				[canvas.width, canvas.height] = json.imgSize.map(v => v * (json.scale || 1));

				if (json.stroke && json.stroke.width) {
					let dx = 2 * json.stroke.width * json.scale;
					canvas.width += dx;
					canvas.height += dx;
				}
			}

			let ctx = getContext(canvas);
			let path2d = new Path2D(json.path);

			// rotate  before it is in the canvas (avoids pixelation)
			ctx.translate(canvas.width / 2, canvas.height / 2);
			ctx.scale(json.scale, json.scale);
			ctx.translate(-json.imgSize[0] / 2, -json.imgSize[1] / 2);

			if (json.fill && json.fill.color) {
				ctx.fillStyle = json.fill.color;
				ctx.fill(path2d);
			}
			if (json.stroke && json.stroke.color && json.stroke.width) {
				ctx.strokeStyle = json.stroke.color;
				ctx.lineWidth = json.stroke.width;
				ctx.stroke(path2d);
			}
		}

		let icon = new ol.style.Icon(<any>{
			img: canvas,
			imgSize: [canvas.width, canvas.height],
			rotation: json.rotation,
			scale: 1,
			anchor: json.anchor || [canvas.width / 2, canvas.height],
			anchorOrigin: json.anchorOrigin,
			anchorXUnits: json.anchorXUnits || "pixels",
			anchorYUnits: json.anchorYUnits || "pixels",
			//crossOrigin?: string;
			offset: json.offset,
			offsetOrigin: json.offsetOrigin,
			opacity: json.opacity,
			snapToPixel: json.snapToPixel,
			rotateWithView: json.rotateWithView,
			size: [canvas.width, canvas.height],
			src: undefined
		});

		return mixin(icon, {
			path: json.path,
			stroke: json.stroke,
			fill: json.fill,
			scale: json.scale,
			imgSize: json.imgSize
		});
	}

	private deserializeFill(json: any) {
		let fill = new ol.style.Fill({
			color: json && this.deserializeColor(json)
		});
		return fill;
	}

	private deserializeStroke(json: any) {
		let stroke = new ol.style.Stroke();
		doif(json.color, v => stroke.setColor(v));
		doif(json.lineCap, v => stroke.setLineCap(v));
		doif(json.lineDash, v => stroke.setLineDash(v));
		doif(json.lineJoin, v => stroke.setLineJoin(v));
		doif(json.miterLimit, v => stroke.setMiterLimit(v));
		doif(json.width, v => stroke.setWidth(v));
		return stroke;
	}

	private deserializeColor(fill: Format.Fill) {
		if (fill.color) {
			return fill.color;
		}

		if (fill.gradient) {
			let type = <string>fill.gradient.type;
			let gradient: CanvasGradient;

			if (0 === type.indexOf("linear(")) {
				gradient = this.deserializeLinearGradient(fill.gradient);
			} else if (0 === type.indexOf("radial(")) {
				gradient = this.deserializeRadialGradient(fill.gradient);
			} else throw `unknown gradient type: ${type}`;

			if (fill.gradient.stops) {
				// preserve
				mixin(gradient, {
					stops: fill.gradient.stops
				});

				let stops = <string[]>fill.gradient.stops.split(";");
				stops = stops.map(v => v.trim());

				stops.forEach(colorstop => {
					let stop = colorstop.match(/ \d+%/m);
					if (stop && stop.length) {
						let color = colorstop.substr(0, colorstop.length - stop[0].length);
						gradient.addColorStop(parseInt(stop[0]) / 100, color);
					}
				});
			}

			return gradient;
		}

		if (fill.pattern) {
			let repitition = fill.pattern.repitition;
			let canvas = <HTMLCanvasElement>document.createElement("canvas");

			let spacing = (canvas.width = canvas.height = fill.pattern.spacing || 6);

			let context = getContext(canvas);
			context.fillStyle = fill.pattern.color;

			switch (fill.pattern.orientation) {
				case "horizontal":
					for (var i = 0; i < spacing; i++) {
						context.fillRect(i, 0, 1, 1);
					}
					break;
				case "vertical":
					for (var i = 0; i < spacing; i++) {
						context.fillRect(0, i, 1, 1);
					}
					break;
				case "cross":
					for (var i = 0; i < spacing; i++) {
						context.fillRect(i, 0, 1, 1);
						context.fillRect(0, i, 1, 1);
					}
					break;
				case "forward":
					for (var i = 0; i < spacing; i++) {
						context.fillRect(i, i, 1, 1);
					}
					break;
				case "backward":
					for (var i = 0; i < spacing; i++) {
						context.fillRect(spacing - 1 - i, i, 1, 1);
					}
					break;
				case "diagonal":
					for (var i = 0; i < spacing; i++) {
						context.fillRect(i, i, 1, 1);
						context.fillRect(spacing - 1 - i, i, 1, 1);
					}
					break;
			}

			return mixin(context.createPattern(canvas, repitition || ""), fill.pattern);
		}

		if (fill.image) {
			let canvas = <HTMLCanvasElement>document.createElement("canvas");
			if (!fill.image.imgSize) throw "imgSize required";
			if (!fill.image.imageData) throw "imageData required";
			let [w, h] = ([canvas.width, canvas.height] = fill.image.imgSize);
			let context = getContext(canvas);
			let image = document.createElement("img");
			image.src = fill.image.imageData;
			image.onload = () => context.drawImage(image, 0, 0, w, h);
			return "rgba(255,255,255,0.1)"; // TODO
		}

		throw "invalid color configuration";
	}

	private deserializeLinearGradient(json: any) {
		let rx = /\w+\((.*)\)/m;
		let [x0, y0, x1, y1] = JSON.parse(json.type.replace(rx, "[$1]"));

		let canvas = document.createElement("canvas");

		// not correct, assumes points reside on edge
		canvas.width = Math.max(x0, x1);
		canvas.height = Math.max(y0, y1);

		var context = getContext(canvas);

		let gradient = context.createLinearGradient(x0, y0, x1, y1);
		mixin(gradient, {
			type: `linear(${[x0, y0, x1, y1].join(",")})`
		});
		return gradient;
	}

	private deserializeRadialGradient(json: any) {
		let rx = /radial\((.*)\)/m;
		let [x0, y0, r0, x1, y1, r1] = JSON.parse(json.type.replace(rx, "[$1]"));

		let canvas = document.createElement("canvas");

		// not correct, assumes radial centered
		canvas.width = 2 * Math.max(x0, x1);
		canvas.height = 2 * Math.max(y0, y1);

		var context = getContext(canvas);

		let gradient = context.createRadialGradient(x0, y0, r0, x1, y1, r1);
		mixin(gradient, {
			type: `radial(${[x0, y0, r0, x1, y1, r1].join(",")})`
		});

		return gradient;
	}
}
