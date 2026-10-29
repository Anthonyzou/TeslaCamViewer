<template>
  <div class="chart-wrapper" :style="{ height: `${height}px` }">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<script setup lang="ts">
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Legend,
  LinearScale,
  Tooltip,
  type ChartData,
  type ChartOptions,
  type ChartType,
} from 'chart.js';
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
);

const props = withDefaults(
  defineProps<{
    type?: ChartType;
    data: ChartData;
    options?: ChartOptions;
    height?: number;
  }>(),
  {
    type: 'bar',
    height: 140,
    options: () => ({}),
  }
);

const canvasRef = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

const defaultOptions: ChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      backgroundColor: '#1c1d22',
      titleColor: '#ffffff',
      bodyColor: '#e0e0e0',
      borderColor: '#2e3038',
      borderWidth: 1,
      padding: 8,
      cornerRadius: 6,
      displayColors: false,
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        color: '#7e8290',
        font: {
          size: 10,
        },
      },
    },
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(255, 255, 255, 0.06)',
      },
      ticks: {
        color: '#7e8290',
        font: {
          size: 10,
        },
        precision: 0,
      },
    },
  },
};

function initChart(): void {
  if (!canvasRef.value) return;

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  const mergedOptions: ChartOptions = {
    ...defaultOptions,
    ...props.options,
    plugins: {
      ...defaultOptions.plugins,
      ...props.options?.plugins,
    },
    scales: {
      ...defaultOptions.scales,
      ...props.options?.scales,
    },
  };

  chartInstance = new Chart(canvasRef.value, {
    type: props.type,
    data: props.data,
    options: mergedOptions,
  });
}

onMounted(() => {
  nextTick(() => {
    initChart();
  });
});

watch(
  () => props.data,
  (newData) => {
    if (chartInstance) {
      chartInstance.data = newData;
      chartInstance.update('none');
    } else {
      initChart();
    }
  },
  { deep: true }
);

watch(
  () => [props.options, props.type],
  () => {
    initChart();
  },
  { deep: true }
);

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
});
</script>

<style scoped>
@reference "tailwindcss";

.chart-wrapper {
  @apply relative w-full;
}
</style>
