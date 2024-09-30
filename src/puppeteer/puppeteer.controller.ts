import { Controller, Get, Query } from '@nestjs/common';
import { PuppeteerService } from './puppeteer.service';

@Controller('puppeteer')
export class PuppeteerController {
  constructor(private readonly puppeteerService: PuppeteerService) {}

  @Get('scrape')
  async scrape(@Query('url') url: string) {
    // Khởi tạo trình duyệt
    await this.puppeteerService.initializeBrowser();

    // Thực hiện scraping
    const result = await this.puppeteerService.performWebScraping(url);

    // Đóng trình duyệt
    await this.puppeteerService.closeBrowser();

    return result || 'Failed to scrape the page';
  }
}
