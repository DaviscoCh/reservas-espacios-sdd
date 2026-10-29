import { Schema, model, type HydratedDocument } from 'mongoose';

export const SPACE_TYPES = ['sala', 'cancha'] as const;
export type SpaceType = (typeof SPACE_TYPES)[number];

export interface ISpace {
  name: string;
  type: SpaceType;
  capacity: number;
  location: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const spaceSchema = new Schema<ISpace>(
  {
    name: { type: String, required: [true, 'El nombre es obligatorio'], trim: true },
    type: {
      type: String,
      enum: { values: SPACE_TYPES, message: 'El tipo debe ser sala o cancha' },
      required: [true, 'El tipo es obligatorio'],
    },
    capacity: {
      type: Number,
      required: [true, 'La capacidad es obligatoria'],
      min: [1, 'La capacidad debe ser mayor que cero'],
      validate: {
        validator: Number.isInteger,
        message: 'La capacidad debe ser un número entero',
      },
    },
    location: { type: String, required: [true, 'La ubicación es obligatoria'], trim: true },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    collection: 'espacios',
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret['id'] = String(ret['_id']);
        delete ret['_id'];
        delete ret['__v'];
        return ret;
      },
    },
  },
);

export type SpaceDocument = HydratedDocument<ISpace>;
export const SpaceModel = model<ISpace>('Espacio', spaceSchema);
