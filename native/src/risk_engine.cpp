#include "risk_engine.hpp"

#include <algorithm>

namespace risk {

double compute_risk_score(const RiskFactors& factors) {
  const double weighted =
      factors.conflict_frequency * 0.30 +
      factors.complaint_severity * 0.25 +
      factors.fraud_alerts * 0.20 +
      factors.unresolved_cases * 0.25;

  return std::clamp(weighted, 0.0, 100.0);
}

double compute_batch_average(const std::vector<RiskFactors>& factors_list) {
  if (factors_list.empty()) {
    return 0.0;
  }

  double total = 0.0;
  for (const auto& factors : factors_list) {
    total += compute_risk_score(factors);
  }

  return total / static_cast<double>(factors_list.size());
}

}  // namespace risk