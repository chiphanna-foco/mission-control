// swift-tools-version:5.5
import PackageDescription

let package = Package(
    name: "HealthExportCLI",
    dependencies: [],
    targets: [
        .executableTarget(
            name: "HealthExportCLI",
            dependencies: [],
            swiftSettings: [
                .unsafeFlags(["-suppress-warnings"], .when(configuration: .release)),
            ]
        ),
    ]
)
