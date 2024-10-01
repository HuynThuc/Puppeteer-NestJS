import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

@Injectable()
export class PuppeteerService {
    private browser: puppeteer.Browser;


    // Khởi tạo trình duyệt
    async initializeBrowser() {
        this.browser = await puppeteer.launch({ headless: false }); //headless hiện giao diện trình duyê

    }

    // Đóng trình duyệt
    async closeBrowser() {
        await this.browser.close();
      }


    // //Gọi phương thức hoặc dùng POSTMAN
    // constructor() {
    //     this.initializeBrowser().then(() => {
    //         this.runScraping(); // Gọi phương thức để thực hiện scraping
    //     });
    // }

    //  // Phương thức chạy scraping với URL cụ thể
    //  async runScraping() {
    //     const url = 'https://www.youtube.com/watch?v=ZNHbAOKHFek&list=RDZNHbAOKHFek&start_radio=1'; // Thay đổi URL muốn scrape
    //     const result = await this.performWebScraping(url);
    //     console.log(result); // Hiển thị kết quả
    // }

    // Tự động cuộn trang để tải nội dung
    private async autoScroll(page: puppeteer.Page) {
        try {
            await page.evaluate(async () => {
                await new Promise<void>((resolve) => {
                    let height = 0;
                    const checkAndScroll = setInterval(() => {
                        const scrollHeight = document.documentElement.scrollHeight;
                        window.scrollTo(0, scrollHeight);

                        // Kiểm tra nội dung mới (nếu có)
                        if (scrollHeight === height) {
                            clearInterval(checkAndScroll); //Nếu kh có dừng cuộn
                            resolve();
                        } else {
                            height = scrollHeight;
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
            let title = 'Không có tiêu đề';
            try {
                title = await page.title();
                console.log('Page title:', title);
            } catch (error) {
                console.error('Không có tiêu đề', error);
            }

            // Lấy số lượt xem
            let viewCount = 'Không có view';
            try {
                viewCount = await page.$eval('.view-count', el => el.textContent.trim());
                console.log('ViewCount:', viewCount);
            } catch (error) {
                console.error('Không có lượt xem', error);
            }





            //Lấy mô tả
            let description = 'Không có mô tả';
            try {
                const description = await page.$eval('ytd-expander', (element) => element.textContent.trim());
                console.log('Description:', description);
            } catch (error) {
                console.error('Không có mô tả', error);
            }




            // Lấy transcript (nếu có)
            let transcripts = [];
            try {
                //Nhấn nút Show transcript
                await page.evaluate(() => {
                    const TranscriptButton = document.querySelector<HTMLElement>('#primary-button button');
                    if (TranscriptButton) {
                        TranscriptButton.click();
                    }
                });
                await page.waitForSelector('ytd-transcript-segment-list-renderer', { timeout: 10000 });

                //Lấy nội dung transcript
                transcripts = await page.$$eval('ytd-transcript-segment-renderer', transcriptElements => {
                    return Array.from(transcriptElements).map(transcript => ({
                        segmentText: transcript.querySelector('.segment-text')?.textContent.trim() || '',
                        timestamp: transcript.querySelector('.segment-timestamp')?.textContent.trim() || ''
                    }));
                });
                transcripts.forEach(transcript => {
                    console.log(`Transcript: ${transcript.timestamp}: ${transcript.segmentText}`);
                });

            } catch (error) {
                console.error('Không có transcrip', error);
                transcripts.push({ timestamp: 'Không có', segmentText: 'Không có' });

            }

            //Cuộn trang tự động để tải bình luận
            await this.autoScroll(page);
            //Lấy bình luận
            let comments = [];
            try {
               
                page.waitForSelector('#comments', { timeout: 10000 });
                comments = await page.$$eval('ytd-comment-thread-renderer', commentElements => {
                    return Array.from(commentElements).map(comment => ({
                        author: comment.querySelector('#author-text')?.textContent.trim() || 'Không có tác giả',
                        comment: comment.querySelector('#content-text')?.textContent.trim() || 'Không có bình luận'
                    }));
                });
                comments.forEach(comment => {
                    console.log(`'Comment:'${comment.author}: ${comment.comment}`);
                });
            } catch (error) {
                console.error('Không có comment', error);
            }

            // Trả về kết quả
            return { title, viewCount, description, transcripts, comments };

        } catch (error) {
            console.error('Lỗi khi scarping:', error);
            return null;

        } finally {
            if (page) {
                await page.close();
            }
        }
    }

}
