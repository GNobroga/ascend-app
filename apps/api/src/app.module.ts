import { Module } from '@nestjs/common';
import { infrastructureImports, infrastructureProviders } from './app.infrastructure.js';
import { featureControllers, featureImports, featureProviders } from './features/index.js';

@Module({
  imports: [...infrastructureImports, ...featureImports],
  controllers: featureControllers,
  providers: [...infrastructureProviders, ...featureProviders],
})
export class AppModule { }
