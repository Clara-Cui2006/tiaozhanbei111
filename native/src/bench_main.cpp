#include "risk_engine.hpp"

#include <chrono>
#include <cstddef>
#include <iostream>
#include <random>
#include <thread>
#include <vector>

namespace {

std::vector<risk::RiskFactors> make_dataset(std::size_t count) {
  std::vector<risk::RiskFactors> dataset;
  dataset.reserve(count);

  std::mt19937 generator(42);
  std::uniform_real_distribution<double> dist(0.0, 100.0);

  for (std::size_t index = 0; index < count; ++index) {
    dataset.push_back({
        dist(generator),
        dist(generator),
        dist(generator),
        dist(generator),
    });
  }

  return dataset;
}

}  // namespace

int main(int argc, char** argv) {
  const std::size_t record_count = argc > 1 ? static_cast<std::size_t>(std::stoull(argv[1])) : 1000000;
  std::size_t thread_count = argc > 2 ? static_cast<std::size_t>(std::stoull(argv[2])) : std::thread::hardware_concurrency();
  if (thread_count == 0) {
    thread_count = 1;
  }

  const auto dataset = make_dataset(record_count);
  std::vector<double> partial_sums(thread_count, 0.0);
  std::vector<std::thread> workers;
  workers.reserve(thread_count);

  const std::size_t chunk_size = (record_count + thread_count - 1) / thread_count;

  const auto start = std::chrono::steady_clock::now();
  for (std::size_t thread_index = 0; thread_index < thread_count; ++thread_index) {
    const std::size_t begin = thread_index * chunk_size;
    const std::size_t end = std::min(record_count, begin + chunk_size);

    workers.emplace_back([&dataset, &partial_sums, begin, end, thread_index]() {
      double sum = 0.0;
      for (std::size_t index = begin; index < end; ++index) {
        sum += risk::compute_risk_score(dataset[index]);
      }
      partial_sums[thread_index] = sum;
    });
  }

  for (auto& worker : workers) {
    worker.join();
  }

  double total = 0.0;
  for (const double value : partial_sums) {
    total += value;
  }

  const auto end = std::chrono::steady_clock::now();
  const auto duration_ms = std::chrono::duration_cast<std::chrono::milliseconds>(end - start).count();
  const double average = record_count == 0 ? 0.0 : total / static_cast<double>(record_count);

  std::cout << "records=" << record_count
            << " threads=" << thread_count
            << " avg_score=" << average
            << " elapsed_ms=" << duration_ms
            << std::endl;
  return 0;
}