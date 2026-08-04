#pragma once

#include <vector>

namespace risk {

struct RiskFactors {
  double conflict_frequency;
  double complaint_severity;
  double fraud_alerts;
  double unresolved_cases;
};

double compute_risk_score(const RiskFactors& factors);
double compute_batch_average(const std::vector<RiskFactors>& factors_list);

}  // namespace risk