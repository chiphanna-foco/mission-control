#!/usr/bin/env swift

import HealthKit
import Foundation

// MARK: - Health Data Exporter

class HealthDataExporter {
    let healthStore = HKHealthStore()
    
    func requestAuthorization(completion: @escaping (Bool, Error?) -> Void) {
        guard HKHealthStore.isHealthDataAvailable() else {
            completion(false, NSError(domain: "HealthKit", code: -1, userInfo: [NSLocalizedDescriptionKey: "HealthKit not available"]))
            return
        }
        
        let typesToRead: Set<HKObjectType> = [
            HKObjectType.quantityType(forIdentifier: .stepCount)!,
            HKObjectType.quantityType(forIdentifier: .heartRate)!,
            HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!,
            HKObjectType.quantityType(forIdentifier: .sleepAnalysis)!,
            HKObjectType.workoutType()
        ]
        
        healthStore.requestAuthorization(toShare: [], read: typesToRead) { success, error in
            completion(success, error)
        }
    }
    
    func exportDailyMetrics(forDate date: Date = Date(), completion: @escaping ([String: Any]?, Error?) -> Void) {
        var metrics: [String: Any] = [:]
        metrics["timestamp"] = ISO8601DateFormatter().string(from: Date())
        metrics["date"] = ISO8601DateFormatter().string(from: date)
        
        let calendar = Calendar.current
        let startOfDay = calendar.startOfDay(for: date)
        let endOfDay = calendar.date(byAdding: .day, value: 1, to: startOfDay)!
        
        let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: endOfDay, options: .strictStartDate)
        
        // Fetch steps
        fetchSteps(predicate: predicate) { steps, error in
            if let steps = steps {
                metrics["steps"] = steps
            }
            
            // Fetch heart rate
            self.fetchHeartRate(predicate: predicate) { hr, error in
                if let hr = hr {
                    metrics["heart_rate"] = hr
                }
                
                // Fetch active calories
                self.fetchActiveCalories(predicate: predicate) { calories, error in
                    if let calories = calories {
                        metrics["active_calories"] = calories
                    }
                    
                    // Fetch sleep data
                    self.fetchSleepData(predicate: predicate) { sleep, error in
                        if let sleep = sleep {
                            metrics["sleep"] = sleep
                        }
                        
                        // Fetch workouts
                        self.fetchWorkouts(predicate: predicate) { workouts, error in
                            if let workouts = workouts {
                                metrics["workouts"] = workouts
                            }
                            
                            completion(metrics, nil)
                        }
                    }
                }
            }
        }
    }
    
    // MARK: - Individual Fetch Methods
    
    private func fetchSteps(predicate: NSPredicate, completion: @escaping (Int?, Error?) -> Void) {
        guard let stepType = HKObjectType.quantityType(forIdentifier: .stepCount) else {
            completion(nil, NSError(domain: "HealthKit", code: -1, userInfo: nil))
            return
        }
        
        let query = HKStatisticsQuery(quantityType: stepType, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, result, error in
            let steps = result?.sumQuantity()?.doubleValue(for: HKUnit.count()).Int ?? 0
            completion(steps, error)
        }
        
        healthStore.execute(query)
    }
    
    private func fetchHeartRate(predicate: NSPredicate, completion: @escaping ([String: Double]?, Error?) -> Void) {
        guard let heartRateType = HKObjectType.quantityType(forIdentifier: .heartRate) else {
            completion(nil, NSError(domain: "HealthKit", code: -1, userInfo: nil))
            return
        }
        
        let query = HKStatisticsQuery(quantityType: heartRateType, quantitySamplePredicate: predicate, options: [.discreteAverage, .discreteMin, .discreteMax]) { _, result, error in
            var hrData: [String: Double] = [:]
            
            if let average = result?.averageQuantity()?.doubleValue(for: HKUnit(from: "count/min")) {
                hrData["average"] = average
            }
            if let min = result?.minimumQuantity()?.doubleValue(for: HKUnit(from: "count/min")) {
                hrData["min"] = min
            }
            if let max = result?.maximumQuantity()?.doubleValue(for: HKUnit(from: "count/min")) {
                hrData["max"] = max
            }
            
            completion(hrData.isEmpty ? nil : hrData, error)
        }
        
        healthStore.execute(query)
    }
    
    private func fetchActiveCalories(predicate: NSPredicate, completion: @escaping (Double?, Error?) -> Void) {
        guard let calorieType = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned) else {
            completion(nil, NSError(domain: "HealthKit", code: -1, userInfo: nil))
            return
        }
        
        let query = HKStatisticsQuery(quantityType: calorieType, quantitySamplePredicate: predicate, options: .cumulativeSum) { _, result, error in
            let calories = result?.sumQuantity()?.doubleValue(for: HKUnit.kilocalorie())
            completion(calories, error)
        }
        
        healthStore.execute(query)
    }
    
    private func fetchSleepData(predicate: NSPredicate, completion: @escaping ([String: Any]?, Error?) -> Void) {
        guard let sleepType = HKObjectType.categorySampleType(forIdentifier: .sleepAnalysis) else {
            completion(nil, NSError(domain: "HealthKit", code: -1, userInfo: nil))
            return
        }
        
        let query = HKSampleQuery(sampleType: sleepType, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, error in
            var sleepData: [String: Any] = [:]
            
            if let samples = samples as? [HKCategorySample] {
                var totalDuration: TimeInterval = 0
                var sleepCount = 0
                var qualityScore: Double = 0
                
                for sample in samples {
                    let duration = sample.endDate.timeIntervalSince(sample.startDate)
                    totalDuration += duration
                    sleepCount += 1
                    
                    // Interpret sleep quality (in real HealthKit, this would be more nuanced)
                    if sample.value == HKCategoryValueSleepAnalysis.inBed.rawValue {
                        qualityScore += 0.7
                    } else if sample.value == HKCategoryValueSleepAnalysis.asleep.rawValue {
                        qualityScore += 1.0
                    }
                }
                
                if sleepCount > 0 {
                    sleepData["total_minutes"] = Int(totalDuration / 60)
                    sleepData["quality_score"] = qualityScore / Double(sleepCount)
                    sleepData["sleep_periods"] = sleepCount
                }
            }
            
            completion(sleepData.isEmpty ? nil : sleepData, error)
        }
        
        healthStore.execute(query)
    }
    
    private func fetchWorkouts(predicate: NSPredicate, completion: @escaping ([[String: Any]]?, Error?) -> Void) {
        let query = HKSampleQuery(sampleType: HKObjectType.workoutType(), predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, error in
            var workouts: [[String: Any]] = []
            
            if let samples = samples as? [HKWorkout] {
                for workout in samples {
                    var workoutData: [String: Any] = [:]
                    workoutData["type"] = workout.workoutActivityType.rawValue
                    workoutData["start"] = ISO8601DateFormatter().string(from: workout.startDate)
                    workoutData["end"] = ISO8601DateFormatter().string(from: workout.endDate)
                    workoutData["duration_minutes"] = Int(workout.duration / 60)
                    
                    if let energy = workout.totalEnergyBurned?.doubleValue(for: .kilocalorie()) {
                        workoutData["calories_burned"] = energy
                    }
                    
                    workouts.append(workoutData)
                }
            }
            
            completion(workouts.isEmpty ? nil : workouts, error)
        }
        
        healthStore.execute(query)
    }
}

// MARK: - Main Execution

let exporter = HealthDataExporter()

// Request authorization
exporter.requestAuthorization { success, error in
    if !success {
        print("❌ Failed to authorize HealthKit: \(error?.localizedDescription ?? "Unknown error")")
        exit(1)
    }
    
    print("✅ HealthKit authorized")
    
    // Export data for today
    exporter.exportDailyMetrics { metrics, error in
        if let error = error {
            print("❌ Export failed: \(error.localizedDescription)")
            exit(1)
        }
        
        if let metrics = metrics {
            // Convert to JSON and print
            if let jsonData = try? JSONSerialization.data(withJSONObject: metrics, options: .prettyPrinted),
               let jsonString = String(data: jsonData, encoding: .utf8) {
                print(jsonString)
            }
        } else {
            print("⚠️ No health data available")
        }
        
        exit(0)
    }
    
    // Keep process alive for async operations
    RunLoop.main.run()
}
