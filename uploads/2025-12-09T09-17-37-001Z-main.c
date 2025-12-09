/* main.c - STM32F103ZET Music Player (Songs + Volume + LEDs + Rests + UART Terminal) */

/* Includes ------------------------------------------------------------------*/
#include "main.h"
#include "lcd.h"
#include <stdio.h> // [新增] 引入標準輸入輸出庫以使用 printf

/* Private function prototypes -----------------------------------------------*/
void SystemClock_Config(void);
void MX_TIM3_Init(void);
void MX_ADC1_Init(void); 
void MX_USART1_UART_Init(void); // [新增] UART 初始化宣告
void PlayNote(uint16_t freq);
void StopNote(void);

/* Handles */
TIM_HandleTypeDef htim3;
ADC_HandleTypeDef hadc1; 
UART_HandleTypeDef huart1;      // [新增] UART Handle

/* Global Variables */
// 將 song 變數移到全域，方便 PlayNote 函式讀取歌名
int song = 0; // 0 = song1 (Little Star), 1 = song2 (Little Bee)

/* ---- LCD Strings ---------------------------------------------------------*/
unsigned char String1[5]  = {DM,Du,Ds,Di,Dc};
unsigned char String2[3]  = {DB,Do,Dx};
unsigned char String3[11] = {DS,Do,Dn,Dg,DColon,DL,Di,Dt,Dt,Dl,De};
unsigned char String4[4]  = {DS,Dt,Da,Dr};
unsigned char String5[14] = {DS,Dt,Da,Dt,Du,Ds,DColon,DP,Dl,Da,Dy,Di,Dn,Dg};
unsigned char String6[3]  = {Db,De,De};
unsigned char String7[12] = {DS,Dt,Da,Dt,Du,Ds,DColon,DP,Da,Du,Ds,De};

unsigned char String8[] = {122,123,124};
unsigned char String9[] = {122};

/* ---- Frequencies (Hz) ----------------------------------------------------*/
#define REST 0   
#define D4 294
#define E4 330
#define FS4 370
#define G4 392
#define GS4 415
#define A4 440
#define B4 494
#define C5 523
#define CS5 554
#define D5 587
#define E5 659
#define F5 698
#define FS5 740
#define G5 784
#define GS5 831
#define A5 880
#define B5 988
#define C6 1047
#define D6 1175
#define E6 1319

/* Songs Data (Full Versions with Rests) */
// Song 1: 小星星 
uint16_t song1[] = {
    C5, C5, G5, G5, A5, A5, G5, REST,
    F5, F5, E5, E5, D5, D5, C5, REST,
    G5, G5, F5, F5, E5, E5, D5, REST,
    G5, G5, F5, F5, E5, E5, D5, REST,
    C5, C5, G5, G5, A5, A5, G5, REST,
    F5, F5, E5, E5, D5, D5, C5
};
uint16_t song1_len = sizeof(song1) / sizeof(song1[0]);

// Song 2: 小蜜蜂 
uint16_t song2[] = {
    G5, E5, E5, REST, F5, D5, D5, REST, 
    C5, D5, E5, F5, G5, G5, G5, REST,
    G5, G5, G5, G5, E5, E5, E5, REST, 
    F5, F5, F5, F5, D5, D5, D5, REST, 
    G5, E5, E5, REST, F5, D5, D5, REST, 
    C5, E5, G5, G5, C5
};
uint16_t song2_len = sizeof(song2) / sizeof(song2[0]);

// Song 3: 歡樂頌 (貝多芬)
uint16_t song3[] = {
    CS5, CS5, D5, E5, E5, D5, CS5, B4, A4, A4, B4, CS5, CS5, B4, B4,
    CS5, CS5, D5, E5, E5, D5, CS5, B4, A4, A4, B4, CS5, B4, A4, A4,
    B4, B4, CS5, A4, B4, CS5, D5, CS5, A4, B4, CS5, D5, CS5, B4, A4, B4, E4,
    CS5, CS5, D5, E5, E5, D5, CS5, B4, A4, A4, B4, CS5, B4, A4, A4,
    A4, A4, B4, CS5, D5, E5, FS5, FS5, G5, A5, B5, A5, G5, FS5, D5, D5, E5, FS5, FS5,
    E5, E5, FS5, FS5, G5, A5, B5, A5, G5, FS5, D5, D5, E5, FS5, E5, D5, D5,
    CS5, CS5, D5, E5, E5, D5, CS5, B4, A4, A4, B4, CS5, CS5, B4, B4,
    CS5, CS5, D5, E5, E5, D5, CS5, B4, A4, A4, B4, CS5, B4, A4, A4,
    B4, B4, CS5, A4, B4, CS5, D5, CS5, A4, B4, CS5, D5, CS5, B4, A4, B4, E4,
    CS5, CS5, D5, E5, E5, D5, CS5, B4, A4, A4, B4, CS5, B4, A4, A4,
    A4, A4, B4, CS5, D5, E5, FS5, FS5, G5, A5, B5, A5, G5, FS5, D5, D5, E5, FS5, FS5,
    E5, E5, FS5, FS5, G5, A5, B5, A5, G5, FS5, D5, D5, E5, FS5, E5, D5, D5,
    FS4, A4, D5, FS5, FS5, FS5, G5, A5, B5, A5, G5, FS5, D5, D5, E5, FS5, E5, D5, D5,
    D4, D6, D6, D6, D6, E6, D6, CS5, E6, D6, B5, D6, CS5, A5, CS5, D6, E6,
    D6, E6, B5, GS5, CS5, CS5, D5, E5, E5, D5, CS5, B4, A4, A4, B4, CS5, CS5, B4, B4,
    CS5, CS5, D5, E5, E5, D5, CS5, B4, A4, A4, B4, CS5, B4, A4, A4,
    B4, B4, CS5, A4, B4, CS5, D5, CS5, A4, B4, CS5, D5, CS5, B4, A4, B4, E4,
    CS5, CS5, D5, E5, E5, D5, CS5, B4, A4, A4, B4, CS5, B4, A4, A4,
    A4, A4, B4, CS5, D5, E5, FS5, FS5, G5, A5, B5, A5, G5, FS5, D5, D5, E5, FS5, FS5,
    E5, E5, FS5, FS5, G5, A5, B5, A5, G5, FS5, D5, D5, E5, FS5, E5, D5, D5,
    FS4, A4, D5, FS5, FS5, FS5, G5, A5, B5, A5, G5, FS5, D5, D5, E5, FS5, E5, D5, D5, D4
};
uint16_t song3_len = sizeof(song3) / sizeof(song3[0]);

/* song3 音符持續時間 (毫秒) */
uint16_t song3_durations[] = {
    625, 625, 625, 625, 625, 625, 625, 562, 625, 625, 625, 625, 937, 312, 1125,
    625, 625, 625, 625, 625, 625, 625, 562, 625, 625, 625, 625, 937, 312, 1125,
    625, 625, 625, 625, 625, 312, 312, 625, 562, 625, 312, 312, 625, 625, 625, 625, 562,
    1250, 625, 625, 625, 625, 625, 625, 562, 625, 625, 625, 625, 937, 312, 562,
    104, 104, 104, 104, 104, 140, 625, 625, 625, 625, 625, 625, 625, 562, 625, 625, 625, 625, 937,
    312, 1125, 625, 625, 625, 625, 625, 625, 625, 562, 625, 625, 625, 625, 937, 312, 562,
    156, 156, 156, 140, 625, 625, 625, 625, 625, 312, 312, 625, 562, 625, 312, 312, 625, 625, 625, 625, 562,
    1875, 625, 625, 625, 625, 625, 562, 625, 625, 625, 625, 937, 281, 26, 26, 26, 26, 26, 26, 26,
    26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26,
    26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 26, 625, 625, 625, 625, 625, 625, 625,
    562, 625, 625, 625, 625, 937, 312, 1125, 625, 625, 625, 625, 625, 625, 625, 562, 625, 625, 625, 625,
    937, 312, 1125, 625, 625, 625, 625, 625, 312, 312, 625, 562, 625, 312, 312, 625, 625, 625, 625, 562,
    1250, 625, 625, 625, 625, 625, 625, 562, 625, 625, 625, 625, 937, 312, 562, 104, 104, 104, 104, 104,
    140, 625, 625, 625, 625, 625, 625, 625, 562, 625, 625, 625, 625, 937, 312, 1125,
    625, 625, 625, 625, 625, 625, 625, 562, 625, 625, 625, 625, 937, 312, 562, 156, 156, 156, 140,
    625, 625, 625, 625, 625, 625, 625, 562, 625, 625, 625, 625, 937, 312, 1125, 2250
};


/* ---- [新增] Retarget printf to UART ---------------------------------------*/
// 為了使用 printf，必須重新定義 fputc 函式 (參考 Lab 3)
#ifdef __GNUC__
  #define PUTCHAR_PROTOTYPE int __io_putchar(int ch)
#else
  #define PUTCHAR_PROTOTYPE int fputc(int ch, FILE *f)
#endif

PUTCHAR_PROTOTYPE
{
  // 將字元透過 UART1 發送出去
  HAL_UART_Transmit(&huart1, (uint8_t *)&ch, 1, 0xFFFF);
  return ch;
}

/* ---- Main ----------------------------------------------------------------*/
int main(void)
{
    HAL_Init();
    SystemClock_Config();

    /* -- GPIO Clock Enable -- */
    __HAL_RCC_GPIOA_CLK_ENABLE(); 
    __HAL_RCC_GPIOC_CLK_ENABLE(); 
    __HAL_RCC_GPIOB_CLK_ENABLE(); 
    __HAL_RCC_ADC1_CLK_ENABLE();  
    __HAL_RCC_GPIOF_CLK_ENABLE(); 
    __HAL_RCC_USART1_CLK_ENABLE(); // [新增] 啟用 USART1 時鐘

    /* ---- Buttons Init ----------------------------------------------------*/
    GPIO_InitTypeDef GPIO_InitStruct = {0};

    // Button1: PA0
    GPIO_InitStruct.Pin  = GPIO_PIN_0;
    GPIO_InitStruct.Mode = GPIO_MODE_INPUT;
    GPIO_InitStruct.Pull = GPIO_NOPULL;
    GPIO_InitStruct.Speed = GPIO_SPEED_FREQ_HIGH;
    HAL_GPIO_Init(GPIOA, &GPIO_InitStruct);

    // Button2: PC13
    GPIO_InitStruct.Pin  = GPIO_PIN_13;
    GPIO_InitStruct.Mode = GPIO_MODE_INPUT;
    GPIO_InitStruct.Pull = GPIO_PULLUP;
    GPIO_InitStruct.Speed = GPIO_SPEED_FREQ_HIGH;
    HAL_GPIO_Init(GPIOC, &GPIO_InitStruct);

    /* ---- LEDs Init (PF6-PF9) ---------------------------------------------*/
    GPIO_InitStruct.Pin = GPIO_PIN_6 | GPIO_PIN_7 | GPIO_PIN_8 | GPIO_PIN_9;
    GPIO_InitStruct.Mode = GPIO_MODE_OUTPUT_PP; 
    GPIO_InitStruct.Pull = GPIO_NOPULL;
    GPIO_InitStruct.Speed = GPIO_SPEED_FREQ_HIGH;
    HAL_GPIO_Init(GPIOF, &GPIO_InitStruct);

    HAL_GPIO_WritePin(GPIOF, GPIO_PIN_6 | GPIO_PIN_7 | GPIO_PIN_8 | GPIO_PIN_9, GPIO_PIN_RESET);

    /* ---- LCD Init ------------------------------------------------------*/
    LCD_Init();
    LCD_Clear();

    /* ---- Peripherals Init ----------------------------------------------*/
    MX_TIM3_Init();
    MX_ADC1_Init(); 
    MX_USART1_UART_Init(); // [新增] 初始化 UART

    HAL_TIM_PWM_Start(&htim3, TIM_CHANNEL_1);
    HAL_ADCEx_Calibration_Start(&hadc1);

    /* ---- Logic Variables -----------------------------------------------*/
    int status = 1;    // 1 = PAUSE, 0 = PLAY
    // int song = 0;   // 移至全域變數區 (0=小星星, 1=小蜜蜂, 2=歡樂頌)

    int lastBtn1 = HAL_GPIO_ReadPin(GPIOA, GPIO_PIN_0);
    int lastBtn2 = HAL_GPIO_ReadPin(GPIOC, GPIO_PIN_13);

    uint32_t noteIndex = 0;

    // 開機顯示
    printf("\r\n=== STM32 Music Player Started ===\r\n");

    /* ---- Main Loop -----------------------------------------------------*/
    while (1)
    {
        /* ========== Button 1 (PA0): Play / Pause ========== */
        int btn1 = HAL_GPIO_ReadPin(GPIOA, GPIO_PIN_0);
        if (lastBtn1 == 0 && btn1 == 1) {
            HAL_Delay(20); 
            if (HAL_GPIO_ReadPin(GPIOA, GPIO_PIN_0) == 1) {
                status = !status;   
                printf("Status Changed: %s\r\n", (status==0) ? "PLAY" : "PAUSE");
            }
        }
        lastBtn1 = btn1;

        /* ========== Button 2 (PC13): Switch Song ========== */
        int btn2 = HAL_GPIO_ReadPin(GPIOC, GPIO_PIN_13);
        if (lastBtn2 == 1 && btn2 == 0) {
            HAL_Delay(20); 
            if (HAL_GPIO_ReadPin(GPIOC, GPIO_PIN_13) == 0) {
                song = (song + 1) % 3;  // 循環切換 0, 1, 2   
                noteIndex = 0;     
                char* songNames[] = {"Little Star", "Little Bee", "Ode to Joy"};
                printf("Song Switched: %s\r\n", songNames[song]);
            }
        }
        lastBtn2 = btn2;

        /* ========== LED Logic ========== */
        if (song == 0) {
            HAL_GPIO_WritePin(GPIOF, GPIO_PIN_6, GPIO_PIN_SET);   
            HAL_GPIO_WritePin(GPIOF, GPIO_PIN_7, GPIO_PIN_RESET); 
        } else if (song == 1) {
            HAL_GPIO_WritePin(GPIOF, GPIO_PIN_6, GPIO_PIN_RESET); 
            HAL_GPIO_WritePin(GPIOF, GPIO_PIN_7, GPIO_PIN_SET);   
        } else {
            // song == 2 (歡樂頌)
            HAL_GPIO_WritePin(GPIOF, GPIO_PIN_6, GPIO_PIN_SET); 
            HAL_GPIO_WritePin(GPIOF, GPIO_PIN_7, GPIO_PIN_SET); 
        }

        if (status == 0) {
            HAL_GPIO_WritePin(GPIOF, GPIO_PIN_8, GPIO_PIN_SET);   
            HAL_GPIO_WritePin(GPIOF, GPIO_PIN_9, GPIO_PIN_RESET); 
        } else {
            HAL_GPIO_WritePin(GPIOF, GPIO_PIN_8, GPIO_PIN_RESET); 
            HAL_GPIO_WritePin(GPIOF, GPIO_PIN_9, GPIO_PIN_SET);   
        }

        /* ---------- LCD Display Logic ------------------------------ */
        LCD_DrawString(0, 0,  String1, 5);
        LCD_DrawString(0, 50, String2, 3);
        LCD_DrawString(2, 0,  String3, 11);

        if (status == 0) LCD_DrawString(4, 0, String5, 14);
        else {
            LCD_DrawString(4, 0, String7, 12);
            LCD_DrawString(4, 96, String8, sizeof(String8));
        }

        if (song == 0) LCD_DrawString(2, 95, String4, 4);
        else {
            LCD_DrawString(2, 95, String6, 3);
            LCD_DrawString(2, 119, String9, sizeof(String9));
        }

        /* ---------- Music Playback Logic ---------- */
        if (status == 0) {
            uint16_t freq;
            uint32_t len;
            uint32_t duration = 350; // 預設持續時間

            if (song == 0) {
                len = song1_len;
                if (noteIndex >= len) noteIndex = 0;
                freq = song1[noteIndex];
            } else if (song == 1) {
                len = song2_len;
                if (noteIndex >= len) noteIndex = 0;
                freq = song2[noteIndex];
            } else {
                // song == 2 (歡樂頌)
                len = song3_len;
                if (noteIndex >= len) noteIndex = 0;
                freq = song3[noteIndex];
                duration = song3_durations[noteIndex]; // 使用 MIDI 持續時間
            }

            // Play Note (Handle REST and UART Print internally)
            PlayNote(freq);

            if (song == 2) {
                HAL_Delay(duration * 0.9); // 90% 的時間發聲
                StopNote();
                HAL_Delay(duration * 0.1); // 10% 的時間停頓
            } else {
                HAL_Delay(350); 
                StopNote();
                HAL_Delay(60);  
            }

            noteIndex++;
        } else {
            StopNote();
            HAL_Delay(50);
        }
    }
}

/* ========================================================================== */
/* TIM3 PWM Init                                                              */
/* ========================================================================== */
void MX_TIM3_Init(void)
{
    __HAL_RCC_TIM3_CLK_ENABLE();
    htim3.Instance = TIM3;
    htim3.Init.Prescaler = 72 - 1;       
    htim3.Init.CounterMode = TIM_COUNTERMODE_UP;
    htim3.Init.Period = 1000 - 1;        
    htim3.Init.ClockDivision = TIM_CLOCKDIVISION_DIV1;
    HAL_TIM_PWM_Init(&htim3);

    TIM_OC_InitTypeDef sConfigOC = {0};
    sConfigOC.OCMode = TIM_OCMODE_PWM1;
    sConfigOC.Pulse = 0; 
    sConfigOC.OCPolarity = TIM_OCPOLARITY_HIGH;
    HAL_TIM_PWM_ConfigChannel(&htim3, &sConfigOC, TIM_CHANNEL_1);

    GPIO_InitTypeDef gpio = {0};
    gpio.Pin = GPIO_PIN_6;
    gpio.Mode = GPIO_MODE_AF_PP;
    gpio.Speed = GPIO_SPEED_FREQ_HIGH;
    HAL_GPIO_Init(GPIOA, &gpio); 
}

/* ========================================================================== */
/* ADC1 Init                                                                  */
/* ========================================================================== */
void MX_ADC1_Init(void)
{
    ADC_ChannelConfTypeDef sConfig = {0};
    GPIO_InitTypeDef GPIO_InitStruct = {0};
    GPIO_InitStruct.Pin = GPIO_PIN_4; 
    GPIO_InitStruct.Mode = GPIO_MODE_ANALOG;
    HAL_GPIO_Init(GPIOC, &GPIO_InitStruct);

    hadc1.Instance = ADC1;
    hadc1.Init.ScanConvMode = ADC_SCAN_DISABLE;
    hadc1.Init.ContinuousConvMode = DISABLE;
    hadc1.Init.DiscontinuousConvMode = DISABLE;
    hadc1.Init.ExternalTrigConv = ADC_SOFTWARE_START;
    hadc1.Init.DataAlign = ADC_DATAALIGN_RIGHT;
    hadc1.Init.NbrOfConversion = 1;
    HAL_ADC_Init(&hadc1);

    sConfig.Channel = ADC_CHANNEL_14; 
    sConfig.Rank = ADC_REGULAR_RANK_1;
    sConfig.SamplingTime = ADC_SAMPLETIME_55CYCLES_5; 
    HAL_ADC_ConfigChannel(&hadc1, &sConfig);
}

/* ========================================================================== */
/* USART1 Init [新增] (9600, 8N1, PA9/PA10)                                   */
/* ========================================================================== */
void MX_USART1_UART_Init(void)
{
    huart1.Instance = USART1;
    huart1.Init.BaudRate = 9600;
    huart1.Init.WordLength = UART_WORDLENGTH_8B;
    huart1.Init.StopBits = UART_STOPBITS_1;
    huart1.Init.Parity = UART_PARITY_NONE;
    huart1.Init.Mode = UART_MODE_TX_RX;
    huart1.Init.HwFlowCtl = UART_HWCONTROL_NONE;
    huart1.Init.OverSampling = UART_OVERSAMPLING_16;
    HAL_UART_Init(&huart1);

    // GPIO Init for PA9 (TX) and PA10 (RX)
    GPIO_InitTypeDef GPIO_InitStruct = {0};
    GPIO_InitStruct.Pin = GPIO_PIN_9;
    GPIO_InitStruct.Mode = GPIO_MODE_AF_PP;
    GPIO_InitStruct.Speed = GPIO_SPEED_FREQ_HIGH;
    HAL_GPIO_Init(GPIOA, &GPIO_InitStruct);

    GPIO_InitStruct.Pin = GPIO_PIN_10;
    GPIO_InitStruct.Mode = GPIO_MODE_INPUT;
    GPIO_InitStruct.Pull = GPIO_NOPULL;
    HAL_GPIO_Init(GPIOA, &GPIO_InitStruct);
}

/* ---- PlayNote (With Volume, Rest, and UART Display) ---- */
void PlayNote(uint16_t freq)
{
    if (freq == REST) {
        __HAL_TIM_SET_COMPARE(&htim3, TIM_CHANNEL_1, 0);
        return;
    }

    uint32_t period = 1000000UL / freq;
    if (period < 2) period = 2;
    
    // 1. 讀取旋鈕音量
    uint32_t adcValue = 0;
    HAL_ADC_Start(&hadc1);
    if (HAL_ADC_PollForConversion(&hadc1, 10) == HAL_OK) {
        adcValue = HAL_ADC_GetValue(&hadc1);
    }
    
    // 2. [新增] 計算音量百分比並發送至終端機
    // 計算百分比: (adcValue / 4095) * 100
    int vol_percent = (adcValue * 100) / 4095;
    
    // 判斷當前歌曲名稱
    char *currentSongName;
    if (song == 0) {
        currentSongName = "Little Star";
    } else if (song == 1) {
        currentSongName = "Little Bee ";
    } else {
        currentSongName = "Ode to Joy";
    }

    // 列印資訊: "Song: [Name] | Volume: [XX]%"
    printf("Playing: %s | Volume: %d%%\r\n", currentSongName, vol_percent);

    // 3. 計算 PWM Pulse
    uint32_t pulse = (period * adcValue) / 8192;

    __HAL_TIM_SET_AUTORELOAD(&htim3, period - 1);
    __HAL_TIM_SET_COMPARE(&htim3, TIM_CHANNEL_1, pulse); 
    __HAL_TIM_SET_COUNTER(&htim3, 0);
}

void StopNote(void)
{
    __HAL_TIM_SET_COMPARE(&htim3, TIM_CHANNEL_1, 0);
}

/* ---- System Clock Config ---- */
void SystemClock_Config(void)
{
    RCC_ClkInitTypeDef clkinitstruct = {0};
    RCC_OscInitTypeDef oscinitstruct = {0};

    oscinitstruct.OscillatorType      = RCC_OSCILLATORTYPE_HSE;
    oscinitstruct.HSEState            = RCC_HSE_ON;
    oscinitstruct.HSEPredivValue      = RCC_HSE_PREDIV_DIV1;
    oscinitstruct.PLL.PLLState        = RCC_PLL_ON;
    oscinitstruct.PLL.PLLSource       = RCC_PLLSOURCE_HSE;
    oscinitstruct.PLL.PLLMUL          = RCC_PLL_MUL9;
    HAL_RCC_OscConfig(&oscinitstruct);

    clkinitstruct.ClockType = RCC_CLOCKTYPE_SYSCLK | RCC_CLOCKTYPE_HCLK |
                              RCC_CLOCKTYPE_PCLK1 | RCC_CLOCKTYPE_PCLK2;
    clkinitstruct.SYSCLKSource = RCC_SYSCLKSOURCE_PLLCLK;
    clkinitstruct.AHBCLKDivider = RCC_SYSCLK_DIV1;
    clkinitstruct.APB2CLKDivider = RCC_HCLK_DIV1;
    clkinitstruct.APB1CLKDivider = RCC_HCLK_DIV2;
    HAL_RCC_ClockConfig(&clkinitstruct, FLASH_LATENCY_2);
}