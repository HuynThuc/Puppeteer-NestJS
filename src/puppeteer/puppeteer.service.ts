import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

@Injectable()
export class PuppeteerService {
    private browser: puppeteer.Browser;

    // Khởi tạo trình duyệt
    async initializeBrowser() {
        this.browser = await puppeteer.launch({ headless: true });
    }

    // Đóng trình duyệt
    async closeBrowser() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    // Tự động cuộn trang để tải nội dung
    private async autoScroll(page: puppeteer.Page) {
        try {
            await page.evaluate(async () => {
                await new Promise<void>((resolve) => {
                    let previousHeight = 0;
                    const checkAndScroll = setInterval(() => {
                        const scrollHeight = document.documentElement.scrollHeight;
                        window.scrollTo(0, scrollHeight);
                        
                        // Kiểm tra xem có thêm nội dung mới không
                        if (scrollHeight === previousHeight) {
                            clearInterval(checkAndScroll);
                            resolve();
                        } else {
                            previousHeight = scrollHeight;
                        }
                    }, 5000); // Đợi 5 giây giữa mỗi lần cuộn
                });
            });
        } catch (error) {
            console.error('Lỗi khi tự động cuộn:', error);
        }
    }

    // Thực hiện web scraping
    async performWebScraping(url: string) {
        let page: puppeteer.Page;
        try {
            // Kiểm tra nếu trình duyệt chưa được khởi tạo
            if (!this.browser) {
                throw new Error('Browser not initialized. Call initializeBrowser() first.');
            }

            // Tạo trang mới
            page = await this.browser.newPage();
            // Điều hướng đến URL
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

            // Lấy tiêu đề
            let title = 'Unknown Title';
            try {
                title = await page.title();
                console.log('Page title:', title);
            } catch (error) {
                console.error('Error fetching title:', error);
            }

            // Lấy số lượt xem
            let viewCount = 'Không có view';
            try {
                viewCount = await page.$eval('.view-count', el => el.textContent.trim());
                console.log('ViewCount:', viewCount);
            } catch (error) {
                console.error('Lỗi khi tìm lượt xem:', error);
            }

            // Lấy mô tả
            let description = 'Không có mô tả';
            try {
                description = await page.$eval('ytd-expander', el => el.textContent.trim());
                console.log('Description:', description);
            } catch (error) {
                console.error('Lỗi khi tìm mô tả:', error);
            }
            
            //Lấy transcript (nếu có)
        
            let transcript = 'Không có transcript';
            try {
                // Chờ và click vào nút 'More actions'
                await page.waitForSelector('button[aria-label="More actions"]', { timeout: 5000 });
                await page.click('button[aria-label="More actions"]');

                // Chờ cho menu hiện ra và kiểm tra nếu transcript có sẵn
                await page.waitForSelector('tp-yt-paper-item[role="menuitem"]', { timeout: 5000 });

                const hasTranscript = await page.evaluate(() => {
                    const items = Array.from(document.querySelectorAll('tp-yt-paper-item[role="menuitem"]'));
                    return items.some(item => item.textContent.includes('Show transcript'));
                });

                if (hasTranscript) {
                    // Nhấn vào "Show transcript" nếu có
                    await page.evaluate(() => {
                        const items = Array.from(document.querySelectorAll('tp-yt-paper-item[role="menuitem"]'));
                        const transcriptItem = items.find(item => item.textContent.includes('Show transcript')) as HTMLElement;
                        if (transcriptItem) transcriptItem.click();
                    });

                    // Chờ transcript renderer hiện ra
                    await page.waitForSelector('ytd-transcript-renderer', { timeout: 5000 });

                    // Lấy transcript text
                    transcript = await page.evaluate(() => {
                        const transcriptSegments = Array.from(document.querySelectorAll('ytd-transcript-body-renderer div.segment'));
                        return transcriptSegments.map(segment => {
                            const timeElement = segment.querySelector('.segment-timestamp');
                            const textElement = segment.querySelector('.segment-text');
                            const time = timeElement ? timeElement.textContent.trim() : '';
                            const text = textElement ? textElement.textContent.trim() : '';
                            return `${time} ${text}`;
                        }).join('\n');
                    });
                }

                console.log('Transcript:', transcript);

            } catch (error) {
                console.error('Lỗi khi tìm transcript:', error.message);
            }


            // Cuộn trang tự động để tải bình luận
            await this.autoScroll(page);

            // Lấy bình luận
            let comments = [];
            try {
                await page.waitForSelector('#comments', { timeout: 10000 });
                comments = await page.$$eval('ytd-comment-thread-renderer', commentElements => {
                    return Array.from(commentElements).map(comment => {
                        const authorElement = comment.querySelector('#author-text');
                        const contentElement = comment.querySelector('#content-text');

                        return {
                            author: authorElement ? authorElement.textContent.trim() : '',
                            comment: contentElement ? contentElement.textContent.trim() : ''
                        };
                    });
                });
                if (comments.length === 0) {
                    comments.push({ author: 'Không có tác giả', comment: 'Không có bình luận' });
                }
                comments.forEach(comment => {
                    console.log(`'Comment:'${comment.author}: ${comment.comment}`);
                });
            } catch (error) {
                console.error('Lỗi khi tìm comments:', error);
            }

            // Trả về kết quả
            return { title, viewCount, transcript, description, comments };

        } catch (error) {
            console.error('Error while scraping:', error);
            return null;

        } finally {
           
            if (page) {
                await page.close();
            }
        }
    }

    
}
