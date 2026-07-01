import { z } from "zod";

const hexColor = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Expected a 6-digit hex color like #4F46E5");

export const colorTokensSchema = z.object({
  primary: hexColor,
  secondary: hexColor,
  accent: hexColor,
  neutral: hexColor,
  background: hexColor,
  surface: hexColor,
  success: hexColor,
  warning: hexColor,
  danger: hexColor,
});

export const fontTokensSchema = z.object({
  display: z.string().min(1),
  body: z.string().min(1),
});

export const designTokensSchema = z.object({
  name: z.string().min(1),
  colors: colorTokensSchema,
  colorsDark: colorTokensSchema.partial().optional(),
  fonts: fontTokensSchema,
  radius: z.string().regex(/^\d+(\.\d+)?(px|rem)$/).default("0.5rem"),
});

export type DesignTokens = z.infer<typeof designTokensSchema>;
