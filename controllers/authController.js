const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const Staff = require("../models/Staff");
const Guardian = require("../models/Guardian");
const Student = require("../models/Student");
const Role = require("../models/Roles");

// Helper function to find user by identifier for students and staff
async function findUser(identifier) {
  const staffUser = await Staff.findOne({
    $or: [{ email: identifier }, { username: identifier }],
  })
    .populate("roles", "roleName")
    .exec();
  if (staffUser) {
    return { user: staffUser, userType: "staff" };
  }

  const guardianUser = await Guardian.findOne({ email: identifier }).exec();
  if (guardianUser) {
    const students = await Student.find({ guardians: guardianUser._id }).exec();
    const hasActiveStudent = students.some((student) => student.active);

    guardianUser.active = hasActiveStudent;
    guardianUser.inactiveReason = hasActiveStudent
      ? null
      : "No active students";

    return { user: guardianUser, userType: "guardian" };
  }

  const studentUser = await Student.findOne({ admissionNumber: identifier })
    .populate("intakeGroup")
    .exec();
  if (studentUser) {
    return { user: studentUser, userType: "student" };
  }

  return null;
}

async function findUserById(id) {
  const staffUser = await Staff.findById(id)
    .populate("roles", "roleName")
    .exec();
  if (staffUser) {
    return { user: staffUser, userType: "staff" };
  }

  const guardianUser = await Guardian.findById(id).exec();
  if (guardianUser) {
    return { user: guardianUser, userType: "guardian" };
  }

  const studentUser = await Student.findById(id).exec();
  if (studentUser) {
    return { user: studentUser, userType: "student" };
  }

  return null;
}

const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  console.log(req.body);
  if (!identifier || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const result = await findUser(identifier);
  if (!result) {
    return res
      .status(401)
      .json({ message: "Unauthorized - User not found or inactive" });
  }
  const { user, userType } = result;

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res
      .status(401)
      .json({ message: "Unauthorized - Incorrect password" });
  }

  if (user.mustChangePassword) {
    return res.status(403).json({ message: "Password reset required" });
  }

  const currentDate = new Date();
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(currentDate.getMonth() - 1);
  let needsAgreement = false;

  if (
    !user.agreementAccepted ||
    !user.agreementAcceptedDate ||
    new Date(user.agreementAcceptedDate) < oneMonthAgo
  ) {
    needsAgreement = true;
  }

  let accessToken;
  let avatarUrl = null;

  if (user.profile && user.profile.avatar) {
    const avatarKey = user.profile.avatar.split(".com/")[1];
    avatarUrl = "";
  }

  // if (user.active) {
  //   const roles = user.roles ? user.roles.map(role => role.roleName) : [];
  //   console.log('Roles:', roles);

  //   accessToken = jwt.sign(
  //     {
  //       UserInfo: {
  //         id: user._id,
  //         userType: userType,
  //         userFirstName: user.profile ? user.profile.firstName : user.firstName,
  //         userLastName: user.profile ? user.profile.lastName : user.lastName,
  //         roles: roles,
  //         image: avatarUrl,
  //         needsAgreement: needsAgreement,
  //       },
  //     },
  //     process.env.ACCESS_TOKEN_SECRET,
  //     { expiresIn: '8h' }
  //   );
  // } else {
  //   accessToken = jwt.sign(
  //     {
  //       UserInfo: {
  //         id: user._id,
  //         userFirstName: user.profile ? user.profile.firstName : user.firstName,
  //         userLastName: user.profile ? user.profile.lastName : user.lastName,
  //         active: user.active,
  //         inactiveReason: user.inactiveReason,
  //       },
  //     },
  //     process.env.ACCESS_TOKEN_SECRET,
  //     { expiresIn: '8h' }
  //   );

  // }

  if (user.active) {
    const roles = user.roles ? user.roles.map((role) => role.roleName) : [];
    console.log("Roles:", roles);

    const tokenPayload = {
      UserInfo: {
        id: user._id,
        userType: userType,
        userFirstName: user.profile ? user.profile.firstName : user.firstName,
        userLastName: user.profile ? user.profile.lastName : user.lastName,
        roles: roles,
        image: "",
        needsAgreement: needsAgreement,
      },
    };

    if (userType === "student") {
      tokenPayload.UserInfo.intakeGroup =
        user.intakeGroup.length > 0 ? user.intakeGroup[0]._id : null;
    }

    accessToken = jwt.sign(tokenPayload, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "8h",
    });
  } else {
    accessToken = jwt.sign(
      {
        UserInfo: {
          id: user._id,
          userFirstName: user.profile ? user.profile.firstName : user.firstName,
          userLastName: user.profile ? user.profile.lastName : user.lastName,
          active: user.active,
          inactiveReason: user.inactiveReason,
        },
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "8h" }
    );
  }

  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" }
  );

  console.log("Generated Access Token:", accessToken);
  console.log("Generated Refresh Token:", refreshToken);

  user.refreshToken = refreshToken;
  await user.save();

  return res.json({ accessToken, refreshToken });
});

// @desc Refresh
// @route POST /auth/refresh
// @access Public

const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res
      .status(401)
      .json({ message: "Unauthorized - No refresh token provided" });
  }

  console.log("Received Refresh Token:", refreshToken);

  jwt.verify(
    refreshToken,
    process.env.REFRESH_TOKEN_SECRET,
    async (err, decoded) => {
      if (err) {
        console.error("JWT Verification Error:", err);
        return res
          .status(403)
          .json({ message: "Forbidden - Refresh token invalid" });
      }

      const result = await findUserById(decoded.id);
      if (!result) {
        return res
          .status(401)
          .json({ message: "Unauthorized - User not found" });
      }
      const { user, userType } = result;

      // Check if the provided refresh token matches the stored one
      console.log("Stored Refresh Token:", user.refreshToken);
      if (user.refreshToken !== refreshToken) {
        console.error("Refresh Token Mismatch");
        return res
          .status(403)
          .json({ message: "Forbidden - Refresh token mismatch" });
      }

      const userInfo = {
        id: user._id,
        userFirstName: user.profile ? user.profile.firstName : user.firstName,
        userLastName: user.profile ? user.profile.lastName : user.lastName,
      };

      if (user.active) {
        userInfo.userType = userType;
        if (user.roles && user.roles.length > 0) {
          userInfo.roles = user.roles.map((role) => role.roleName);
        }

        let avatarUrl = null;
        if (user.profile && user.profile.avatar) {
          const avatarKey = user.profile.avatar.split(".com/")[1]; // Extract the key from the URL
          avatarUrl = "";
        }
        userInfo.image = avatarUrl;
      } else {
        userInfo.active = user.active;
        userInfo.inactiveReason = user.inactiveReason;
      }

      const newAccessToken = jwt.sign(
        { UserInfo: userInfo },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "8h" }
      );

      // Issue a new refresh token
      const newRefreshToken = jwt.sign(
        { id: user._id },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: "7d" }
      );

      // Update the stored refresh token in the database
      user.refreshToken = newRefreshToken;
      await user.save();

      console.log("Generated Access Token:", newAccessToken);
      console.log("Generated Refresh Token:", newRefreshToken);

      res.json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
    }
  );
});

// @desc Logout
// @route POST /auth/logout
// @access Public
const logout = (req, res) => {
  const cookies = req.cookies;
  if (!cookies?.jwt) return res.sendStatus(204); // No content to send back

  res.clearCookie("jwt", { httpOnly: true, sameSite: "None", secure: true });
  res.json({ message: "Logged out successfully" });
};

module.exports = {
  login,
  refreshToken,
  logout,
};
