import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PuppeteerModule } from './puppeteer/puppeteer.module';

@Module({
  imports: [PuppeteerModule],
  controllers: [AppController], // Không cần PuppeteerController ở đây
  providers: [AppService], // Không cần PuppeteerService ở đây
})
export class AppModule {}
