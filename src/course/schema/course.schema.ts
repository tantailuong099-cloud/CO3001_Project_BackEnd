// src\course\schema\course.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/* ---------------------------
   HELPERS: normalize arrays
----------------------------*/
function normalizeArray(value: any): string[] {
  if (!value) return [];

  // Case: already array
  if (Array.isArray(value)) {
    return value.map(v => String(v).trim());
  }

  // Case: stringified array "['A','B']"
  if (typeof value === 'string') {
    try {
      const arr = JSON.parse(
        value
          .replace(/'/g, '"')   // convert single → double quote
      );
      if (Array.isArray(arr)) return arr.map(v => String(v).trim());
    } catch (e) {
      // fallback: return single-item array
      return [value.trim()];
    }
  }

  // fallback: ensure array of string
  return [String(value).trim()];
}


export class Schedule {
  date: Date;
  session: string;
  form: string;
  location: string;
  status: string;
  studentAttemp: string[];
}

export class Materials {
  general: string[];
  reference: string[];
  slide: string[];
}

@Schema({ timestamps: true })
export class Course {
  @Prop({ required: true })
  courseCode: string;

  @Prop({ required: true })
  courseName: string;

  @Prop({ required: true })
  department: string;

  @Prop()
  description: string;

  @Prop()
  duration: string;

  @Prop({ required: true })
  semester: string; // e.g. "2025 Spring"

  // NEW: list of class group identifiers for this course (e.g. ["A","B","C"])
  @Prop({
    type: [String],
    default: [],
    set: (val: any) => normalizeArray(val),       // FIXED: Works with both string & array from DB
  })
  classGroups: string[];

  @Prop({ required: true, default: 30 })
  capacity: number;

  // --- Registration period ---
  @Prop({ required: true })
  registrationStart: Date;

  @Prop({ required: true })
  registrationEnd: Date;

  // --- Teaching period ---
  @Prop({ required: true })
  courseStart: Date;

  @Prop({ required: true })
  courseEnd: Date;

  // --- Relationships ---
  // Keep tutors as potential tutors (not assigned to specific classGroup)
  @Prop({
    type: [String],
    default: [],
    set: (val: any) => normalizeArray(val),         // FIXED: also normalize tutors field
  })
  tutors: string[];

  @Prop()
  schedule: Schedule[];

  @Prop()
  material: Materials;

  // --- Status ---
  @Prop({
    enum: ['upcoming', 'registration', 'ongoing', 'completed'],
    default: 'upcoming',
  })
  status: string;
}

export type CourseDocument = HydratedDocument<Course>;
export const CourseSchema = SchemaFactory.createForClass(Course);
