import {Entity, IEntityParams} from "../../entity/Entity";
import {Vec3} from "../../math/Vec3";
import {X_COLOR, Y_COLOR, Z_COLOR} from "./colors";
import {ArrowEntity} from "./ArrowEntity";

export interface IAxisEntityParams extends IEntityParams {
    size?: number;
}

export class MoveAxisEntity extends Entity {
    protected _size: number;
    public override childrenNodes: ArrowEntity[];

    constructor(params: IAxisEntityParams = {}) {
        super(params);
        this._size = params.size != undefined ? params.size : 1.5;
        this.childrenNodes = [];
        this._init();
    }

    private _init() {

        let arrowX = new ArrowEntity({
            color: X_COLOR,
            yaw: 0,
            pitch: 0,
            roll: 90,
            properties: {opName: "move_x", noEdit: true}
        });

        let arrowY = new ArrowEntity({
            color: Y_COLOR,
            yaw: 0,
            pitch: 0,
            roll: 0,
            properties: {opName: "move_y", noEdit: true}
        });

        let arrowZ = new ArrowEntity({
            color: Z_COLOR,
            yaw: 0,
            pitch: 90,
            roll: 0,
            properties: {opName: "move_z", noEdit: true}
        });

        this.appendChild(arrowX);
        this.appendChild(arrowY);
        this.appendChild(arrowZ);

        this.setSize(this._size);
    }

    public setSize(size: number) {
        this.childrenNodes[0].setSize(size);
        this.childrenNodes[1].setSize(size);
        this.childrenNodes[2].setSize(size);
    }

    public setPitch(a: number) {
        let line = this.childrenNodes[0];
        let tip = line.childrenNodes[0];
        line.geoObject!.setPitch(a);
        tip.geoObject!.setPitch(a);

        line = this.childrenNodes[1];
        tip = line.childrenNodes[0];
        line.geoObject!.setPitch(a);
        tip.geoObject!.setPitch(a);

        line = this.childrenNodes[2];
        tip = line.childrenNodes[0];
        line.geoObject!.setPitch(a + 90);
        tip.geoObject!.setPitch(a + 90);
    }

    public setYaw(a: number) {
        let line = this.childrenNodes[0];
        let tip = line.childrenNodes[0];
        line.geoObject!.setYaw(a);
        tip.geoObject!.setYaw(a);

        line = this.childrenNodes[1];
        tip = line.childrenNodes[0];
        line.geoObject!.setYaw(a);
        tip.geoObject!.setYaw(a);

        line = this.childrenNodes[2];
        tip = line.childrenNodes[0];
        line.geoObject!.setYaw(a);
        tip.geoObject!.setYaw(a);
    }

    public setRoll(a: number) {
        let line = this.childrenNodes[0];
        let tip = line.childrenNodes[0];
        line.geoObject!.setRoll(a + 90);
        tip.geoObject!.setRoll(a + 90);

        line = this.childrenNodes[1];
        tip = line.childrenNodes[0];
        line.geoObject!.setRoll(a);
        tip.geoObject!.setRoll(a);
    }

    public getY(): Vec3 {
        return this.childrenNodes[1].geoObject!.rotation.mulVec3(new Vec3(0.0, 1.0, 0.0)).normalize();
    }
}