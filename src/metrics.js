const os = require('os');
const config = require('./config.js');

class Metrics {
  constructor() {
    this.metricBuffer = [];

    this.getRequests = 0;
    this.postRequests = 0;
    this.putRequests = 0;
    this.deleteRequests = 0;

    this.totalUsers = 0;

    this.authSuccess = 0;
    this.authFailure = 0;

    this.pizzaPurchases = 0;
    this.pizzaFailures = 0;
    this.revenue = 0;

    this.requestLatencies = [];
    this.pizzaLatencies = [];

    // This will periodically sent metrics to Grafana
    const timer = setInterval(() => {
      try {
        // HTTP Requests
        this.queueHttpMetric('all', this.totalRequests);
        this.queueHttpMetric('get', this.getRequests);
        this.queueHttpMetric('post', this.postRequests);
        this.queueHttpMetric('put', this.putRequests);
        this.queueHttpMetric('delete', this.deleteRequests);

        // Active users
        this.queueUserMetric(this.totalUsers);

        // Authentication attempts
        this.queueAuthMetric('Success', this.authSuccess);
        this.queueAuthMetric('Failure', this.authFailure);

        // CPU and memory usage
        this.queueComputerMetric('Memory', this.memoryUsagePercentage);
        this.queueComputerMetric('CPU', this.cpuUsagePercentage);

        // Pizzas
        this.queuePizzaMetric('Purchases', this.pizzaPurchases);
        this.queuePizzaMetric('Failures', this.pizzaFailures);
        this.queueRevenueMetric(this.revenue);

        // Latency
        this.queueLatencyMetric('request', this.averageRequestLatency);
        this.queueLatencyMetric('pizza', this.averagePizzaLatency);
        this.requestLatencies = [];
        this.pizzaLatencies = [];

        const metrics = this.metricBuffer.join('\n');
        this.sendMetricToGrafana(metrics);
        this.metricBuffer = [];
      } catch (error) {
        console.log('Error sending metrics', error);
      }
    }, 10 * 1000);
    timer.unref();
  }

  // Send methods
  sendMetricToGrafana(metric) {
    fetch(`${config.metrics.url}`, {
      method: 'post',
      body: metric,
      headers: { Authorization: `Bearer ${config.metrics.userId}:${config.metrics.apiKey}` },
    })
    .then((response) => {
      if (!response.ok) {
        console.error('Failed to push metrics data to Grafana');
      } else {
        console.log(`Pushed ${metric}`);
      }
    })
    .catch((error) => {
      console.error('Error pushing metrics:', error);
    });
  }

  queueHttpMetric(httpMethod, metricValue) {
    const metric = `request,source=${config.metrics.source},method=${httpMethod} total=${metricValue}`;
    this.metricBuffer.push(metric);
  }
  
  queueUserMetric(metricValue) {
    const metric = `active_user,source=${config.metrics.source} total=${metricValue}`;
    this.metricBuffer.push(metric);
  }
  
  queueAuthMetric(result, metricValue) {
    const metric = `auth_attempt,source=${config.metrics.source},result=${result} total=${metricValue}`;
    this.metricBuffer.push(metric);
  }
  
  queueComputerMetric(resource, metricValue) {
    const metric = `resource,source=${config.metrics.source},resource=${resource} percentage=${metricValue}`;
    this.metricBuffer.push(metric);
  }
  
  queuePizzaMetric(action, metricValue) {
    const metric = `pizza,source=${config.metrics.source},action=${action} total=${metricValue}`;
    this.metricBuffer.push(metric);
  }
  
  queueRevenueMetric(metricValue) {
    const metric = `revenue,source=${config.metrics.source} total=${metricValue}`;
    this.metricBuffer.push(metric);
  }

  queueLatencyMetric(action, metricValue) {
    const metric = `latency,source=${config.metrics.source},action=${action} total=${metricValue}`;
    this.metricBuffer.push(metric);
  }

  // HTTP methods
  get totalRequests() {
    return this.getRequests + this.postRequests + this.putRequests + this.deleteRequests;
  }

  incrementGetRequests() {
    this.getRequests++;
  }

  incrementPostRequests() {
    this.postRequests++;
  }

  incrementPutRequests() {
    this.putRequests++;
  }

  incrementDeleteRequests() {
    this.deleteRequests++;
  }

  // Active user methods
  incrementTotalUsers() {
    this.totalUsers++;
  }

  decrementTotalUsers() {
    this.totalUsers--;
  }

  // Auth attempt methods
  incrementAuthSuccess() {
    this.authSuccess++;
  }

  incrementAuthFailure() {
    this.authFailure++;
  }

  // Computer resource methods
  get cpuUsagePercentage() {
    const cpuUsage = os.loadavg()[0] / os.cpus().length;
    return cpuUsage.toFixed(2) * 100;
  }
  
  get memoryUsagePercentage() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = (usedMemory / totalMemory) * 100;
    return memoryUsage.toFixed(2);
  }

  // Pizza methods
  incrementPizzaPurchases() {
    this.pizzaPurchases++;
  }

  incrementPizzaFailures() {
    this.pizzaFailures++;
  }

  increaseRevenue(addedRevenue) {
    this.revenue += addedRevenue;
  }

  // Latency methods
  addRequestLatency(addedLatency) {
    this.requestLatencies.push(addedLatency);
  }
  
  addPizzaLatency(addedLatency) {
    this.pizzaLatencies.push(addedLatency);
  }

  get averageRequestLatency() {
    if (this.requestLatencies.length === 0) {
      return 0;
    }
    return this.requestLatencies.reduce((sum, latency) => sum + latency, 0) / this.requestLatencies.length;
  }

  get averagePizzaLatency() {
    if (this.pizzaLatencies.length === 0) {
      return 0;
    }
    return this.pizzaLatencies.reduce((sum, latency) => sum + latency, 0) / this.pizzaLatencies.length;
  }
}

const metrics = new Metrics();
module.exports = metrics;
