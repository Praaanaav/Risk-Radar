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
  age: z.number().describe('The age of the patient.'),
  gender: z.string().describe('The gender of the patient.'),
  priorInpatientVisits: z.number().describe('The number of prior inpatient visits of the patient.'),
  diagnosis: z.string().describe('The primary diagnosis of the patient.'),
  medications: z.string().describe('The list of medications the patient is currently taking.'),
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
  prompt: `You are a healthcare expert. Summarize the following patient data in plain English, highlighting the key factors that might influence a readmission risk assessment.\n\nPatient Data:\nAge: {{{age}}}\nGender: {{{gender}}}\nPrior Inpatient Visits: {{{priorInpatientVisits}}}\nDiagnosis: {{{diagnosis}}}\nMedications: {{{medications}}}`,
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
