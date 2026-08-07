#include "risk_engine.hpp"

#include <iostream>
#include <vector>

int main() {
  std::vector<risk::RiskFactors> sample = {
      {78.0, 82.0, 66.0, 71.0},
      {55.0, 60.0, 50.0, 48.0},
      {88.0, 86.0, 79.0, 83.0},
  };

  const double avg = risk::compute_batch_average(sample);
  std::cout << "risk_engine_demo average score: " << avg << std::endl;
  return 0;
}