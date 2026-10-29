import { Schema, model, type HydratedDocument } from 'mongoose';

export const USER_ROLES = ['solicitante', 'administrador'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface IUser {
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'El correo es obligatorio'],
      trim: true,
      lowercase: true,
      unique: true,
      match: [EMAIL_PATTERN, 'El correo no tiene un formato válido'],
    },
    // select:false evita que la contraseña cifrada salga en consultas normales.
    passwordHash: { type: String, required: [true, 'La contraseña cifrada es obligatoria'], select: false },
    role: {
      type: String,
      enum: { values: USER_ROLES, message: 'El rol debe ser solicitante o administrador' },
      required: [true, 'El rol es obligatorio'],
    },
  },
  {
    timestamps: true,
    collection: 'usuarios',
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        ret['id'] = String(ret['_id']);
        delete ret['_id'];
        delete ret['__v'];
        delete ret['passwordHash'];
        return ret;
      },
    },
  },
);

export type UserDocument = HydratedDocument<IUser>;
export const UserModel = model<IUser>('Usuario', userSchema);
