import type { ActivationSteps } from './types';

export type ActivationStep = keyof ActivationSteps;

export type StepDefinition = {
  key: ActivationStep;
  label: string;
  description: string;
};

export const ACTIVATION_STEPS: StepDefinition[] = [
  {
    key: 'businessHours',
    label: 'Definir o horário de funcionamento',
    description: 'Os dias e horas em que o negócio abre.',
  },
  { key: 'services', label: 'Cadastrar um serviço', description: 'Com preço e duração, para os clientes escolherem.' },
  {
    key: 'professionals',
    label: 'Cadastrar um profissional',
    description: 'Com expediente e ligado a um serviço ou pacote.',
  },
  {
    key: 'firstAppointment',
    label: 'Fazer o primeiro agendamento',
    description: 'Pela agenda ou pelo cliente, na sua página.',
  },
];
