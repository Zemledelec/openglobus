import {createEvents, EventCallback, EventsHandler} from '../../Events';
import {DEGREES, MAX32} from "../../math";
import {Plane} from "../../math/Plane";
import {Planet} from "../../scene/Planet";
import {RenderNode} from '../../scene/RenderNode';
import {Vector} from '../../layer/Vector';
import {Vec2} from '../../math/Vec2';
import {Vec3} from '../../math/Vec3';
import {Quat} from '../../math/Quat';
import {IMouseState} from "../../renderer/RendererEvents";
import {Ellipsoid} from "../../ellipsoid/Ellipsoid";
import {LonLat} from "../../LonLat";
import {Entity} from "../../entity/Entity";
import {MoveAxisEntity} from "./MoveAxisEntity";
import {MovePlaneEntity} from "./MovePlaneEntity";
import {RotateEntity} from "./RotateEntity";
import {Ray} from "../../math/Ray";
import {Sphere} from "../../bv/Sphere";

export interface IGeoObjectEditorSceneParams {
    planet?: Planet;
    name?: string;
}

type GeoObjectSceneEventsList = [
    "move",
    "mousemove",
    "mouseenter",
    "mouseleave",
    "lclick",
    "rclick",
    "mclick",
    "ldblclick",
    "rdblclick",
    "mdblclick",
    "lup",
    "rup",
    "mup",
    "ldown",
    "rdown",
    "mdown",
    "lhold",
    "rhold",
    "mhold",
    "mousewheel",
    "touchmove",
    "touchstart",
    "touchend",
    "doubletouch",
    "touchleave",
    "touchenter",
    "select",
    "unselect",
];

class GeoObjectEditorScene extends RenderNode {
    public events: EventsHandler<GeoObjectSceneEventsList>;
    protected _planet: Planet | null;
    protected _startPos: Vec2 | null;
    protected _startClick: Vec2;
    protected _moveLayer: Vector;
    protected _planeLayer: Vector;
    protected _rotateLayer: Vector;

    protected _selectedEntity: Entity | null;
    protected _selectedEntityCart: Vec3;
    protected _selectedEntityPitch: number;
    protected _selectedEntityYaw: number;
    protected _selectedEntityRoll: number;
    protected _clickPos: Vec2;

    protected _axisEntity: MoveAxisEntity;
    protected _planeEntity: MovePlaneEntity;
    protected _rotateEntity: RotateEntity;

    protected _selectedMove: string | null;

    protected _ops: Record<string, (mouseState: IMouseState) => void>;

    constructor(options: IGeoObjectEditorSceneParams = {}) {
        super(options.name || 'GeoObjectEditorScene');

        this.events = createEvents(GEOOBJECTEDITORCENE_EVENTS);

        this._planet = options.planet || null;

        this._startPos = null;
        this._startClick = new Vec2();

        this._axisEntity = new MoveAxisEntity();
        this._planeEntity = new MovePlaneEntity();
        this._rotateEntity = new RotateEntity();

        this._moveLayer = new Vector("move-axis", {
            scaleByDistance: [1, MAX32, 1],
            useLighting: false,
            pickingScale: [5, 1.1, 5],
            visibility: false,
            depthOrder: 1000
        });

        this._planeLayer = new Vector("move-plane", {
            scaleByDistance: [1, MAX32, 1],
            useLighting: false,
            //pickingScale: [5, 1.1, 5],
            visibility: false,
            depthOrder: 1000
        });

        this._rotateLayer = new Vector("rotate-circles", {
            useLighting: false,
            visibility: false,
            depthOrder: 1000,
            pickingScale: 5
        });

        this._selectedEntity = null;
        this._clickPos = new Vec2();
        this._selectedEntityCart = new Vec3();
        this._selectedEntityPitch = 0;
        this._selectedEntityYaw = 0;
        this._selectedEntityRoll = 0;
        this._selectedMove = null;

        this._ops = {
            move_x: this._moveX,
            move_y: this._moveY,
            move_z: this._moveZ,
            move_xz: this._moveXZ,
            move_xy: this._moveXY,
            move_zy: this._moveZY,
            rotate_pitch: this._rotatePitch,
            rotate_yaw: this._rotateYaw,
            rotate_roll: this._rotateRoll,
            scale: this._scale,
            scale_x: this._scaleX,
            scale_y: this._scaleY,
            scale_z: this._scaleZ,
        }
    }

    public bindPlanet(planet: Planet) {
        this._planet = planet;
        this._addAxisLayers();
    }

    public override init() {
        this.activate();
    }

    public override onremove() {
        this.deactivate();
    }

    protected _addAxisLayers() {
        if (this._planet) {
            this._moveLayer.addTo(this._planet);
            this._planeLayer.addTo(this._planet);
            this._rotateLayer.addTo(this._planet);

            this._moveLayer.add(this._axisEntity);
            this._moveLayer.events.on("mouseenter", this._onAxisLayerMouseEnter);
            this._moveLayer.events.on("mouseleave", this._onAxisLayerMouseLeave);
            this._moveLayer.events.on("lup", this._onAxisLayerLUp);
            this._moveLayer.events.on("ldown", this._onAxisLayerLDown);

            this._planeLayer.add(this._planeEntity);
            this._planeLayer.events.on("mouseenter", this._onPlaneLayerMouseEnter);
            this._planeLayer.events.on("mouseleave", this._onPlaneLayerMouseLeave);
            this._planeLayer.events.on("lup", this._onPlaneLayerLUp);
            this._planeLayer.events.on("ldown", this._onPlaneLayerLDown);

            this._rotateLayer.add(this._rotateEntity);
            this._rotateLayer.events.on("mouseenter", this._onRotateLayerMouseEnter);
            this._rotateLayer.events.on("mouseleave", this._onRotateLayerMouseLeave);
            this._rotateLayer.events.on("lup", this._onRotateLayerLUp);
            this._rotateLayer.events.on("ldown", this._onRotateLayerLDown);
        }
    }

    protected _onAxisLayerMouseEnter = (e: IMouseState) => {
        this._planet!.renderer!.handler!.canvas!.style.cursor = "pointer";
        e.pickingObject.setColorHTML(e.pickingObject.properties.style.selectColor);
    }

    protected _onAxisLayerMouseLeave = (e: IMouseState) => {
        this._planet!.renderer!.handler!.canvas!.style.cursor = "default";
        e.pickingObject.setColorHTML(e.pickingObject.properties.style.color);
    }

    protected _onAxisLayerLUp = (e: IMouseState) => {
        this._selectedMove = null;
        this._planet!.renderer!.controls.mouseNavigation.activate();
    }

    protected _onAxisLayerLDown = (e: IMouseState) => {
        this._clickPos = e.pos.clone();

        if (this._selectedEntity) {
            this._selectedEntityCart = this._selectedEntity.getCartesian().clone();
        }

        this._selectedMove = e.pickingObject.properties.opName;
        this._planet!.renderer!.controls.mouseNavigation.deactivate();
    }

    protected _onPlaneLayerMouseEnter = (e: IMouseState) => {
        this._planet!.renderer!.handler!.canvas!.style.cursor = "pointer";
        e.pickingObject.geoObject.setColorHTML(e.pickingObject.properties.style.selectColor);
    }

    protected _onPlaneLayerMouseLeave = (e: IMouseState) => {
        this._planet!.renderer!.handler!.canvas!.style.cursor = "default";
        e.pickingObject.geoObject.setColorHTML(e.pickingObject.properties.style.color);
    }

    protected _onPlaneLayerLUp = (e: IMouseState) => {
        this._selectedMove = null;
        this._planet!.renderer!.controls.mouseNavigation.activate();
    }

    protected _onPlaneLayerLDown = (e: IMouseState) => {
        this._clickPos = e.pos.clone();

        if (this._selectedEntity) {
            this._selectedEntityCart = this._selectedEntity.getCartesian().clone();
        }

        this._selectedMove = e.pickingObject.properties.opName;
        this._planet!.renderer!.controls.mouseNavigation.deactivate();
    }

    protected _onRotateLayerMouseEnter = (e: IMouseState) => {
        this._planet!.renderer!.handler!.canvas!.style.cursor = "pointer";
        e.pickingObject.polyline!.setColorHTML(e.pickingObject.properties.style.selectColor);
    }

    protected _onRotateLayerMouseLeave = (e: IMouseState) => {
        this._planet!.renderer!.handler!.canvas!.style.cursor = "default";
        e.pickingObject.polyline!.setColorHTML(e.pickingObject.properties.style.color);
    }

    protected _onRotateLayerLUp = (e: IMouseState) => {
        this._selectedMove = null;
        this._planet!.renderer!.controls.mouseNavigation.activate();
    }

    protected _onRotateLayerLDown = (e: IMouseState) => {
        this._clickPos = e.pos.clone();

        if (this._selectedEntity) {
            this._selectedEntityCart = this._selectedEntity.getCartesian().clone();
            if (this._selectedEntity.geoObject) {
                this._selectedEntityPitch = this._selectedEntity.geoObject.getPitch();
                this._selectedEntityYaw = this._selectedEntity.geoObject.getYaw();
                this._selectedEntityRoll = this._selectedEntity.geoObject.getRoll();
            }
        }

        this._selectedMove = e.pickingObject.properties.opName;
        this._planet!.renderer!.controls.mouseNavigation.deactivate();
    }

    protected _onMouseMove = (e: IMouseState) => {
        if (this._selectedEntity && this._selectedMove && this._ops[this._selectedMove]) {
            this._ops[this._selectedMove](e);
            this.events.dispatch(this.events.move, this._selectedEntity);
        }
    }

    protected _removeAxisLayers() {
        this._moveLayer.remove();
        this._planeLayer.remove();
        this._rotateLayer.remove()
    }

    public activate() {
        this.renderer!.events.on("lclick", this._onLclick);
        this.renderer!.events.on("mousemove", this._onMouseMove);
        this._addAxisLayers();
    }

    protected deactivate() {
        this.renderer!.events.off("lclick", this._onLclick);
        this.renderer!.events.off("mousemove", this._onMouseMove);
        this._removeAxisLayers();
        this.clear();
    }

    // protected _onCornerLdown = (e: IMouseState) => {
    //         this.renderer?.controls.mouseNavigation?.deactivate();
    //         this._startClick.set(e.x, e.y);
    //         let coords = e.pickingObject.getCartesian();
    //         this._startPos = this._planet!.getPixelFromCartesian(coords);
    // }

    // protected _onLUp = () => {
    //     this.renderer!.controls.mouseNavigation?.activate();
    // }

    // protected _onGeoObjectEnter = (e: IMouseState) => {
    //     e.renderer.handler.canvas!.style.cursor = "pointer";
    // }
    //
    // protected _onGeoObjectLeave = (e: IMouseState) => {
    //     e.renderer.handler.canvas!.style.cursor = "default";
    // }

    public setAxisCartesian3v(cartesian: Vec3) {
        this._axisEntity.setCartesian3v(cartesian);
        this._planeEntity.setCartesian3v(cartesian);
        this._rotateEntity.setCartesian3v(cartesian);
    }

    public setVisibility(visibility: boolean) {
        this._moveLayer.setVisibility(visibility);
        this._planeLayer.setVisibility(visibility);
        this._rotateLayer.setVisibility(visibility);
    }

    public readyToEdit(entity: Entity): boolean {
        return !entity.properties || !entity.properties.noEdit
    }

    public select(entity: Entity) {
        if ((!this._selectedEntity || this._selectedEntity && !entity.isEqual(this._selectedEntity)) && this.readyToEdit(entity)) {
            if (this._selectedEntity) {
                this.unselect();
            }
            this._selectedEntity = entity;

            this.setVisibility(true);
            this.events.dispatch(this.events.select, this._selectedEntity);
        }
    }

    public unselect() {
        this.setVisibility(false);
        let selectedEntity = this._selectedEntity;
        this._selectedEntity = null;
        this.events.dispatch(this.events.unselect, selectedEntity);
    }

    protected _onLclick = (e: IMouseState) => {
        if (e.pickingObject && (e.pickingObject instanceof Entity)) {
            this.select(e.pickingObject);
        }
    }

    public clear() {
        this._planet!.removeLayer(this._moveLayer);
        this._planet!.removeLayer(this._planeLayer);
        this._planet!.removeLayer(this._rotateLayer);
    }

    public override frame() {
        if (this._selectedEntity) {
            let cart = this._selectedEntity.getCartesian();
            this._axisEntity.setCartesian3v(cart);
            this._planeEntity.setCartesian3v(cart);
            this._rotateEntity.setCartesian3v(cart);
        }
    }

    public get ellipsoid(): Ellipsoid | null {
        return this._planet ? this._planet.ellipsoid : null;
    }

    protected _moveX = (e: IMouseState) => {
        if (!this._selectedEntity) return;

        let cam = this._planet!.camera;
        let p0 = this._selectedEntityCart;

        let clickDir = cam.unproject(this._clickPos.x, this._clickPos.y);

        let clickCart = new Ray(cam.eye, clickDir).hitSphere(new Sphere(p0.length(), new Vec3()))!;
        let currCart = new Ray(cam.eye, e.direction).hitSphere(new Sphere(p0.length(), new Vec3()))!;

        if (!currCart) return;

        let rot = Quat.getRotationBetweenVectors(
            clickCart.normal(),
            currCart.normal()
        );


        let px = rot.mulVec3(p0);

        let p0_lonLat = this._planet?.ellipsoid.cartesianToLonLat(p0)!;
        let px_lonLat = this._planet?.ellipsoid.cartesianToLonLat(px)!;

        this._planet?.ellipsoid.lonLatToCartesianRes(new LonLat(px_lonLat.lon, p0_lonLat.lat, p0_lonLat.height), px);

        this._selectedEntity.setCartesian3v(px);
    }

    protected _moveY = (e: IMouseState) => {

        if (!this._selectedEntity) return;

        let cam = this._planet!.camera;
        let p0 = this._selectedEntityCart;
        //let groundNormal = this._planet!.ellipsoid.getSurfaceNormal3v(p0);
        let groundNormal = this._axisEntity.getY();
        let p1 = p0.add(groundNormal);
        let p2 = p0.add(cam.getRight());
        let px = new Vec3();

        let clickDir = cam.unproject(this._clickPos.x, this._clickPos.y);

        if (new Ray(cam.eye, clickDir).hitPlane(p0, p1, p2, px) === Ray.INSIDE) {
            let clickCart = Vec3.proj_b_to_a(px, groundNormal);
            if (new Ray(cam.eye, e.direction).hitPlane(p0, p1, p2, px) === Ray.INSIDE) {
                let dragCart = Vec3.proj_b_to_a(px, groundNormal);
                let dragVec = dragCart.sub(clickCart);
                let pos = this._selectedEntityCart.add(dragVec);
                this._selectedEntity.setCartesian3v(pos);
            }
        }
    }

    protected _moveZ = (e: IMouseState) => {
        if (!this._selectedEntity) return;

        let cam = this._planet!.camera;
        let p0 = this._selectedEntityCart;

        let clickDir = cam.unproject(this._clickPos.x, this._clickPos.y);

        let clickCart = new Ray(cam.eye, clickDir).hitSphere(new Sphere(p0.length(), new Vec3()))!;
        let currCart = new Ray(cam.eye, e.direction).hitSphere(new Sphere(p0.length(), new Vec3()))!;

        if (!currCart) return;

        let rot = Quat.getRotationBetweenVectors(
            clickCart.normal(),
            currCart.normal()
        );

        let px = rot.mulVec3(p0);

        let p0_lonLat = this._planet?.ellipsoid.cartesianToLonLat(p0)!;
        let px_lonLat = this._planet?.ellipsoid.cartesianToLonLat(px)!;

        this._planet?.ellipsoid.lonLatToCartesianRes(new LonLat(p0_lonLat.lon, px_lonLat.lat, p0_lonLat.height), px);

        this._selectedEntity.setCartesian3v(px);
    }

    protected _moveXZ = (e: IMouseState) => {
        if (!this._selectedEntity) return;

        let cam = this._planet!.camera;
        let p0 = this._selectedEntityCart;

        let clickDir = cam.unproject(this._clickPos.x, this._clickPos.y);

        let clickCart = new Ray(cam.eye, clickDir).hitSphere(new Sphere(p0.length(), new Vec3()))!;
        let currCart = new Ray(cam.eye, e.direction).hitSphere(new Sphere(p0.length(), new Vec3()))!;

        if (!currCart) return;

        let rot = Quat.getRotationBetweenVectors(
            clickCart.normal(),
            currCart.normal()
        );

        let px = rot.mulVec3(p0);

        this._selectedEntity.setCartesian3v(px);
    }

    protected _moveXY = (e: IMouseState) => {
        console.log("moveXY");
    }

    protected _moveZY = (e: IMouseState) => {
        console.log("moveZY");
    }

    protected _rotatePitch = (e: IMouseState) => {
        if (!this._selectedEntity) return;

        let cam = this._planet!.camera;
        let p0 = this._selectedEntityCart;
        let qNorthFrame = this._planet!.getNorthFrameRotation(p0).conjugate();
        let norm = qNorthFrame.mulVec3(new Vec3(1, 0, 0)).normalize();

        let clickDir = cam.unproject(this._clickPos.x, this._clickPos.y);

        let pl = new Plane(p0, norm);

        let clickCart = new Vec3(),
            dragCart = new Vec3();

        if (new Ray(cam.eye, clickDir).hitPlane2(pl, clickCart) === Ray.INSIDE) {
            if (new Ray(cam.eye, e.direction).hitPlane2(pl, dragCart) === Ray.INSIDE) {

                let c0 = clickCart.sub(p0).normalize(),
                    c1 = dragCart.sub(p0).normalize();

                let sig = Math.sign(c0.cross(c1).dot(norm));
                let angle = Math.acos(c0.dot(c1)) * DEGREES;
                this._selectedEntity.geoObject!.setPitch(this._selectedEntityPitch + sig * angle);
            }
        }
    }

    protected _rotateYaw = (e: IMouseState) => {
        if (!this._selectedEntity) return;

        let cam = this._planet!.camera;
        let p0 = this._selectedEntityCart;
        let qNorthFrame = this._planet!.getNorthFrameRotation(p0).conjugate();
        let norm = qNorthFrame.mulVec3(new Vec3(0, 1, 0)).normalize();

        let clickDir = cam.unproject(this._clickPos.x, this._clickPos.y);

        let pl = new Plane(p0, norm);

        let clickCart = new Vec3(),
            dragCart = new Vec3();

        if (new Ray(cam.eye, clickDir).hitPlane2(pl, clickCart) === Ray.INSIDE) {
            if (new Ray(cam.eye, e.direction).hitPlane2(pl, dragCart) === Ray.INSIDE) {

                let c0 = clickCart.sub(p0).normalize(),
                    c1 = dragCart.sub(p0).normalize();

                let sig = Math.sign(c1.cross(c0).dot(norm));
                let angle = Math.acos(c0.dot(c1)) * DEGREES;
                this._selectedEntity.geoObject!.setYaw(this._selectedEntityYaw + sig * angle);
            }
        }
    }

    protected _rotateRoll = (e: IMouseState) => {
        if (!this._selectedEntity) return;

        let cam = this._planet!.camera;
        let p0 = this._selectedEntityCart;
        let qNorthFrame = this._planet!.getNorthFrameRotation(p0).conjugate();
        let norm = qNorthFrame.mulVec3(new Vec3(0, 0, 1)).normalize();

        let clickDir = cam.unproject(this._clickPos.x, this._clickPos.y);

        let pl = new Plane(p0, norm);

        let clickCart = new Vec3(),
            dragCart = new Vec3();

        if (new Ray(cam.eye, clickDir).hitPlane2(pl, clickCart) === Ray.INSIDE) {
            if (new Ray(cam.eye, e.direction).hitPlane2(pl, dragCart) === Ray.INSIDE) {

                let c0 = clickCart.sub(p0).normalize(),
                    c1 = dragCart.sub(p0).normalize();

                let sig = Math.sign(c0.cross(c1).dot(norm));
                let angle = Math.acos(c0.dot(c1)) * DEGREES;
                this._selectedEntity.geoObject!.setRoll(this._selectedEntityRoll + sig * angle);
            }
        }
    }

    protected _scale = (e: IMouseState) => {
    }

    protected _scaleX = (e: IMouseState) => {
    }

    protected _scaleY = (e: IMouseState) => {
    }

    protected _scaleZ = (e: IMouseState) => {
    }
}

const GEOOBJECTEDITORCENE_EVENTS: GeoObjectSceneEventsList = [
    "move",
    "mousemove",
    "mouseenter",
    "mouseleave",
    "lclick",
    "rclick",
    "mclick",
    "ldblclick",
    "rdblclick",
    "mdblclick",
    "lup",
    "rup",
    "mup",
    "ldown",
    "rdown",
    "mdown",
    "lhold",
    "rhold",
    "mhold",
    "mousewheel",
    "touchmove",
    "touchstart",
    "touchend",
    "doubletouch",
    "touchleave",
    "touchenter",
    "select",
    "unselect"
];

export {GeoObjectEditorScene};
