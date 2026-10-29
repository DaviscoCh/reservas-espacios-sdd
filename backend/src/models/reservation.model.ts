import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export const RESERVATION_STATUSES = ['activa', 'cancelada'] as const;
export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export interface IReservation {
  userId: Types.ObjectId;
  spaceId: Types.ObjectId;
  localDate: string;
  startAt: Date;
  endAt: Date;
  status: ReservationStatus;
  createdAt: Date;
  updatedAt: Date;
}

const reservationSchema = new Schema<IReservation>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'Usuario', required: [true, 'El usuario es obligatorio'] },
    spaceId: { type: Schema.Types.ObjectId, ref: 'Espacio', required: [true, 'El espacio es obligatorio'] },
    localDate: {
      type: String,
      required: [true, 'La fecha local es obligatoria'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'La fecha local debe tener formato YYYY-MM-DD'],
    },
    startAt: { type: Date, required: [true, 'La hora de inicio es obligatoria'] },
    endAt: {
      type: Date,
      required: [true, 'La hora de fin es obligatoria'],
      validate: {
        validator(this: unknown, value: Date): boolean {
          const startAt = (this as { startAt?: Date } | undefined)?.startAt;
          return !startAt || value.getTime() > startAt.getTime();
        },
        message: 'La hora de fin debe ser posterior a la hora de inicio',
      },
    },
    status: {
      type: String,
      enum: { values: RESERVATION_STATUSES, message: 'El estado debe ser activa o cancelada' },
      default: 'activa',
    },
  },
  {
    timestamps: true,
    collection: 'reservas',
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

// T016: búsqueda de solapamientos y disponibilidad por espacio, fecha, estado e intervalo.
reservationSchema.index({ spaceId: 1, localDate: 1, status: 1, startAt: 1, endAt: 1 });
// T016: consulta de "mis reservas" por usuario, estado e inicio.
reservationSchema.index({ userId: 1, status: 1, startAt: 1 });

export type ReservationDocument = HydratedDocument<IReservation>;
export const ReservationModel = model<IReservation>('Reserva', reservationSchema);
