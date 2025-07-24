
'use server';

/**
 * @fileOverview Explains the patient data in plain English.
 *
 * - explainData - A function that handles the explanation of patient data.
 * - ExplainDataInput - The input type for the explainData function.
 * - ExplainDataOutput - The return type for the explainData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExplainDataInputSchema = z.object({
  name: z.string().describe("The patient's name."),
  age: z.number().describe('The age of the patient.'),
  gender: z.string().describe('The gender of the patient.'),
  priorInpatientVisits: z.number().describe('The number of prior inpatient visits of the patient.'),
  diagnosis: z.string().describe('The primary diagnosis of the patient.'),
  medications: z.string().describe('The list of medications the patient is currently taking.'),
  currentCondition: z.string().describe("The patient's description of their current condition."),
});
export type ExplainDataInput = z.infer<typeof ExplainDataInputSchema>;

const ExplainDataOutputSchema = z.object({
  explanation: z.string().describe('A plain English explanation of the patient data.'),
});
export type ExplainDataOutput = z.infer<typeof ExplainDataOutputSchema>;

export async function explainData(input: ExplainDataInput): Promise<ExplainDataOutput> {
  return explainDataFlow(input);
}

const prompt = ai.definePrompt({
  name: 'explainDataPrompt',
  input: {schema: ExplainDataInputSchema},
  output: {schema: ExplainDataOutputSchema},
  prompt: `You are a healthcare expert. Explain the following patient information in simple English that anyone can understand. Focus on the main points that affect the patient's health risk.\n\nPatient Information:\nName: {{{name}}}\nAge: {{{age}}}\nGender: {{{gender}}}\nPrevious Hospital Stays: {{{priorInpatientVisits}}}\nMain Health Problem: {{{diagnosis}}}\nMedicines: {{{medications}}}\nCurrent Situation: {{{currentCondition}}}`,
});

const explainDataFlow = ai.defineFlow(
  {
    name: 'explainDataFlow',
    inputSchema: ExplainDataInputSchema,
    outputSchema: ExplainDataOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
